import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Bike, MapPin, Phone, Package, LogOut, RefreshCw,
  CheckCircle, MessageCircle, X, Send, Navigation,
  Clock, TrendingUp, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
  customer: { id: number; name: string; email: string; phone?: string | null };
}

interface ChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const DELIVERY_STEPS = [
  { key: "assigned",  label: "Assigned",    icon: "📋" },
  { key: "picked_up", label: "Picked Up",   icon: "📦" },
  { key: "delivered", label: "Delivered",   icon: "✅" },
];

const RiderPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [chatOrderId, setChatOrderId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/rider/orders"],
    queryFn: () => api.get("/rider/orders"),
    refetchInterval: 10000,
    enabled: user?.role === "rider",
  });

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const completed = orders.filter(o => o.status === "delivered");
  const cancelled = orders.filter(o => o.status === "cancelled");
  const earnings = completed.reduce((sum, o) => sum + parseFloat(o.total) * 0.1, 0);

  useEffect(() => {
    if (!socket) return;
    socket.on("order_assigned", (data: { orderId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      toast({
        title: "New Delivery Assigned!",
        description: `Order #${String(data.orderId).padStart(5, "0")} is ready for pickup.`,
      });
    });
    return () => { socket.off("order_assigned"); };
  }, [socket, queryClient, toast]);

  // Socket chat
  useEffect(() => {
    if (!socket) return;
    if (chatOrderId !== null) {
      socket.emit("chat:join", { orderId: chatOrderId });
      socket.on("chat:history", (messages: ChatMessage[]) => setChatMessages(messages));
      socket.on("chat:message", (message: ChatMessage) => {
        setChatMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        if (message.senderRole !== "rider") {
          setUnreadCounts(prev => ({ ...prev, [chatOrderId]: (prev[chatOrderId] || 0) + 1 }));
        }
      });
    } else {
      socket.off("chat:history");
      socket.off("chat:message");
    }
    return () => { socket.off("chat:history"); socket.off("chat:message"); };
  }, [socket, chatOrderId]);

  const openChat = useCallback((orderId: number) => {
    setChatOrderId(orderId);
    setChatMessages([]);
    setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !socket || chatOrderId === null || !user) return;
    socket.emit("chat:send", { orderId: chatOrderId, text: chatInput.trim(), senderRole: "rider", senderName: user.name });
    setChatInput("");
  }, [chatInput, socket, chatOrderId, user]);

  // GPS sharing
  const pickedUpOrder = active.find(o => o.status === "picked_up");
  useEffect(() => {
    if (!pickedUpOrder || !socket) {
      if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; setIsSharing(false); }
      return;
    }
    if (!navigator.geolocation) return;
    const shareLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.patch(`/orders/${pickedUpOrder.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsSharing(true);
          } catch { setIsSharing(false); }
        },
        () => setIsSharing(false),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    shareLocation();
    locationIntervalRef.current = setInterval(shareLocation, 5000);
    return () => { if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; setIsSharing(false); } };
  }, [pickedUpOrder?.id, socket]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "picked_up" | "delivered" }) =>
      api.patch(`/rider/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      toast({ title: "Order updated!" });
    },
    onError: () => toast({ title: "Failed to update order", variant: "destructive" }),
  });

  const chatOrder = orders.find(o => o.id === chatOrderId);

  function getStepIndex(status: OrderStatus) {
    return DELIVERY_STEPS.findIndex(s => s.key === status);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-base leading-none">Rider Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSharing && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </motion.div>
          )}
          <button onClick={() => refetch()} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { logout(); navigate("/login"); }} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3.5 border border-border text-center">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Bike className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground leading-none">{active.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Active</p>
        </div>
        <div className="bg-card rounded-2xl p-3.5 border border-border text-center">
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground leading-none">{completed.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Delivered</p>
        </div>
        <div className="bg-gradient-to-br from-primary/5 to-primary/15 rounded-2xl p-3.5 border border-primary/20 text-center">
          <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-lg font-black text-primary leading-none">GH₵{earnings.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Earnings</p>
        </div>
      </div>

      {/* Active Orders */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Deliveries</h2>
          {active.length > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full">{active.length}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="bg-card rounded-2xl h-48 animate-pulse border border-border" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground">No active deliveries</p>
            <p className="text-sm text-muted-foreground mt-1">Kitchen will assign orders to you</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {active.map((order) => {
                const hasUnread = (unreadCounts[order.id] || 0) > 0;
                const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const stepIdx = getStepIndex(order.status);
                const isPickedUp = order.status === "picked_up";

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-card rounded-2xl overflow-hidden border",
                      isPickedUp ? "border-primary shadow-sm shadow-primary/10" : "border-border"
                    )}
                  >
                    {/* Status Progress Bar */}
                    {stepIdx >= 0 && (
                      <div className="px-4 pt-3 pb-2">
                        <div className="flex items-center gap-1">
                          {DELIVERY_STEPS.map((step, i) => (
                            <div key={step.key} className="flex items-center flex-1">
                              <div className={cn(
                                "flex-1 h-1 rounded-full transition-colors",
                                i <= stepIdx ? "bg-primary" : "bg-muted"
                              )} />
                              {i < DELIVERY_STEPS.length - 1 && <div className="w-1" />}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-1">
                          {DELIVERY_STEPS.map((step, i) => (
                            <p key={step.key} className={cn(
                              "text-[9px] font-semibold",
                              i <= stepIdx ? "text-primary" : "text-muted-foreground/50"
                            )}>
                              {step.label}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Header */}
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <div>
                        <p className="font-black text-foreground">#{String(order.id).padStart(5, "0")}</p>
                        <p className="text-xs text-muted-foreground">{order.customer.name} · {formattedTime}</p>
                      </div>
                      {isPickedUp && (
                        <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                          <Navigation className="w-3 h-3" />
                          En Route
                        </div>
                      )}
                    </div>

                    {/* Delivery Info */}
                    <div className="px-4 py-3 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Delivery Address</p>
                          <p className="text-sm text-foreground font-medium leading-snug">{order.deliveryAddress}</p>
                        </div>
                      </div>

                      {order.customer.phone && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <a href={`tel:${order.customer.phone}`} className="text-sm text-primary font-medium hover:underline">
                            {order.customer.phone}
                          </a>
                        </div>
                      )}

                      {/* Items Summary */}
                      <div className="bg-muted/60 rounded-xl px-3 py-2 space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-foreground">{item.quantity}× {item.name}</span>
                            <span className="text-muted-foreground">GH₵{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-1 flex justify-between text-xs font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground">GH₵{parseFloat(order.total).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/10 rounded-lg px-3 py-1.5">
                        <span>Est. commission</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">GH₵{(parseFloat(order.total) * 0.1).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4 flex gap-2">
                      {order.status === "assigned" && (
                        <button
                          onClick={() => statusMutation.mutate({ id: order.id, status: "picked_up" })}
                          disabled={statusMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                        >
                          <Package className="w-4 h-4" />
                          Confirm Pickup
                        </button>
                      )}
                      {order.status === "picked_up" && (
                        <>
                          <button
                            onClick={() => statusMutation.mutate({ id: order.id, status: "delivered" })}
                            disabled={statusMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark Delivered
                          </button>
                          <button
                            onClick={() => openChat(order.id)}
                            className={cn(
                              "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border",
                              hasUnread
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            <MessageCircle className="w-5 h-5" />
                            {hasUnread && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                {unreadCounts[order.id]}
                              </span>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Completed Orders */}
        {(completed.length > 0 || cancelled.length > 0) && (
          <div className="mt-8">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">History</h2>
            <div className="space-y-2">
              {[...completed, ...cancelled].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      order.status === "delivered" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/20"
                    )}>
                      {order.status === "delivered"
                        ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                        : <X className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">#{String(order.id).padStart(5, "0")}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{order.deliveryAddress}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">GH₵{parseFloat(order.total).toFixed(2)}</p>
                    {order.status === "delivered" && (
                      <p className="text-[10px] text-emerald-600 font-semibold">+GH₵{(parseFloat(order.total) * 0.1).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOrderId !== null && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Order #{String(chatOrderId).padStart(5, "0")}</p>
                  <p className="text-xs text-muted-foreground">{chatOrder?.customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setChatOrderId(null)}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="text-muted-foreground/40" size={28} />
                  </div>
                  <p className="font-semibold text-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Send a message to your customer</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.senderRole === "rider";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[78%] px-4 py-2.5 rounded-2xl",
                      isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"
                    )}>
                      {!isMe && (
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-card flex gap-2 items-center safe-bottom">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message customer..."
                className="flex-1 h-11 rounded-xl"
              />
              <Button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiderPage;
