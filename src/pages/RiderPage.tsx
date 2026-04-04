import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bike, MapPin, Phone, Package, LogOut, RefreshCw, CheckCircle, MessageCircle, X, Send, Navigation } from "lucide-react";
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

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  assigned: "Assigned to You",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  picked_up: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

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
  const completed = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const earnings = completed
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + parseFloat(o.total) * 0.1, 0);

  // Socket: new order assignment
  useEffect(() => {
    if (!socket) return;
    socket.on("order_assigned", (data: { orderId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      toast({
        title: "🛵 New Delivery Assigned!",
        description: `Order #${String(data.orderId).padStart(5, "0")} is ready for pickup.`,
      });
    });
    return () => { socket.off("order_assigned"); };
  }, [socket, queryClient, toast]);

  // Socket: chat events — join/leave when chat opens/closes
  useEffect(() => {
    if (!socket) return;

    if (chatOrderId !== null) {
      socket.emit("chat:join", { orderId: chatOrderId });

      socket.on("chat:history", (messages: ChatMessage[]) => {
        setChatMessages(messages);
      });

      socket.on("chat:message", (message: ChatMessage) => {
        setChatMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        // Track unread if chat is closed
        if (message.senderRole !== "rider") {
          setUnreadCounts(prev => ({ ...prev, [chatOrderId]: (prev[chatOrderId] || 0) + 1 }));
        }
      });
    } else {
      socket.off("chat:history");
      socket.off("chat:message");
    }

    return () => {
      socket.off("chat:history");
      socket.off("chat:message");
    };
  }, [socket, chatOrderId]);

  // Clear unread when opening chat
  const openChat = useCallback((orderId: number) => {
    setChatOrderId(orderId);
    setChatMessages([]);
    setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !socket || chatOrderId === null || !user) return;
    socket.emit("chat:send", {
      orderId: chatOrderId,
      text: chatInput.trim(),
      senderRole: "rider",
      senderName: user.name,
    });
    setChatInput("");
  }, [chatInput, socket, chatOrderId, user]);

  // GPS location sharing: broadcast when any order is picked_up
  const pickedUpOrder = active.find(o => o.status === "picked_up");

  useEffect(() => {
    if (!pickedUpOrder || !socket) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
        setIsSharing(false);
      }
      return;
    }

    if (!navigator.geolocation) return;

    const shareLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.patch(`/orders/${pickedUpOrder.id}/location`, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setIsSharing(true);
          } catch { /* silent */ }
        },
        () => { setIsSharing(false); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    shareLocation(); // Share immediately
    locationIntervalRef.current = setInterval(shareLocation, 5000); // Then every 5s

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
        setIsSharing(false);
      }
    };
  }, [pickedUpOrder?.id, socket]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "picked_up" | "delivered" }) =>
      api.patch(`/rider/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      toast({ title: "Order updated successfully" });
    },
    onError: () => toast({ title: "Failed to update order", variant: "destructive" }),
  });

  const chatOrder = orders.find(o => o.id === chatOrderId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bike className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Rider Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSharing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Navigation className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Sharing</span>
            </div>
          )}
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { logout(); navigate("/login"); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <Bike className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{completed.filter(o => o.status === "delivered").length}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-bold text-primary">GH₵{earnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Est. Earnings</p>
        </div>
      </div>

      {/* Active Orders */}
      <div className="px-4 pb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Orders</h2>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
        ) : active.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-medium text-sm">No active deliveries</p>
            <p className="text-xs text-muted-foreground mt-1">Orders assigned by the kitchen will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map(order => {
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const hasUnread = (unreadCounts[order.id] || 0) > 0;
              return (
                <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">#{String(order.id).padStart(5, "0")}</p>
                      <p className="text-xs text-muted-foreground">{formattedTime}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{order.deliveryAddress}</p>
                    </div>
                    {order.customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={`tel:${order.customer.phone}`} className="text-sm text-primary">{order.customer.phone}</a>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Total: GH₵{parseFloat(order.total).toFixed(2)}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {order.status === "assigned" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: order.id, status: "picked_up" })}
                        disabled={statusMutation.isPending}
                        className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60"
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {order.status === "picked_up" && (
                      <>
                        <button
                          onClick={() => statusMutation.mutate({ id: order.id, status: "delivered" })}
                          disabled={statusMutation.isPending}
                          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60"
                        >
                          Mark Delivered
                        </button>
                        <button
                          onClick={() => openChat(order.id)}
                          className={cn(
                            "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                            hasUnread
                              ? "bg-orange-600 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <MessageCircle className="w-5 h-5" />
                          {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                              {unreadCounts[order.id]}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-3">Completed</h2>
            <div className="space-y-3">
              {completed.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">#{String(order.id).padStart(5, "0")}</p>
                    <p className="text-xs text-muted-foreground">{order.deliveryAddress}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">GH₵{parseFloat(order.total).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── CHAT PANEL ── */}
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
              <div>
                <p className="font-bold text-foreground text-sm">
                  Chat — Order #{String(chatOrderId).padStart(5, "0")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {chatOrder?.customer.name}
                </p>
              </div>
              <button
                onClick={() => setChatOrderId(null)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <MessageCircle className="text-muted-foreground/30 mb-3" size={40} />
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation with your customer</p>
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
                      "max-w-[75%] px-4 py-2.5 rounded-2xl",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
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
            <div className="px-4 py-3 border-t border-border bg-card flex gap-2 items-center">
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
