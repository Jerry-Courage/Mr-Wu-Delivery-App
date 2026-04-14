import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, MapPin, Clock, Bike, Send, X, ChevronLeft, CheckCircle2, ChefHat, Package, Loader2 } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import SplashScreen from "@/components/ui/SplashScreen";
import { api } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icons in React/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const riderIcon = L.divIcon({
  className: "custom-rider-icon",
  html: `<div class="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.8)] border-2 border-white animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const customerIcon = L.divIcon({
  className: "custom-customer-icon",
  html: `<div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.8)] border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface OrderDetail {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  notes?: string | null;
  riderLat?: number | null;
  riderLng?: number | null;
  customerLat?: number | null;
  customerLng?: number | null;
  items: OrderItem[];
  rider?: { id: number; name: string } | null;
}

interface AIEta { minutes: number; message: string }

interface ChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const STEPS: { status: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
  { status: "pending",   label: "Order Placed",    desc: "We received your order",           icon: <Package size={18} /> },
  { status: "confirmed", label: "Confirmed",        desc: "Restaurant confirmed your order",  icon: <CheckCircle2 size={18} /> },
  { status: "preparing", label: "Preparing",        desc: "Kitchen is cooking your food",     icon: <ChefHat size={18} /> },
  { status: "ready",     label: "Ready",            desc: "Food is ready for pickup",         icon: <Package size={18} /> },
  { status: "assigned",  label: "Rider Assigned",   desc: "Rider is heading to the restaurant", icon: <Bike size={18} /> },
  { status: "picked_up", label: "Out for Delivery", desc: "Your food is on its way!",         icon: <Bike size={18} /> },
  { status: "delivered", label: "Delivered",        desc: "Enjoy your meal!",                 icon: <CheckCircle2 size={18} /> },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "delivered"];

const TrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", id],
    queryFn: () => api.get(`/orders/${id}`),
    refetchInterval: 10000,
    enabled: !!id,
  });

  const { data: eta } = useQuery<AIEta>({
    queryKey: ["/api/ai/eta", id],
    queryFn: () => api.get(`/ai/eta/${id}`),
    enabled: !!id && !!order && order.status === "picked_up",
    refetchInterval: 60000,
    retry: 1,
  });

  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);

  const isLiveTracking = order?.status === "picked_up";
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  // Initialize map only when actively tracking
  useEffect(() => {
    if (!isLiveTracking) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        riderMarkerRef.current = null;
        customerMarkerRef.current = null;
      }
      return;
    }
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const center: [number, number] = riderCoords || [order?.customerLat || 5.6037, order?.customerLng || -0.187];
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, 14);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; CARTO",
      }).addTo(mapInstanceRef.current);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        riderMarkerRef.current = null;
        customerMarkerRef.current = null;
      }
    };
  }, [isLiveTracking, order?.id]);

  // Update rider marker on map
  useEffect(() => {
    if (!mapInstanceRef.current || !riderCoords || !isLiveTracking) return;
    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker(riderCoords, { icon: riderIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div class="font-bold text-orange-500">${order?.rider?.name || "Your Rider"}</div><div class="text-xs">Approaching...</div>`);
    } else {
      riderMarkerRef.current.setLatLng(riderCoords);
    }
    mapInstanceRef.current.flyTo(riderCoords, 15, { duration: 1.5 });
  }, [riderCoords, isLiveTracking]);

  // Update customer marker on map
  useEffect(() => {
    if (!mapInstanceRef.current || !order?.customerLat || !order?.customerLng || !isLiveTracking) return;
    const coords: [number, number] = [order.customerLat, order.customerLng];
    if (!customerMarkerRef.current) {
      customerMarkerRef.current = L.marker(coords, { icon: customerIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div class="font-bold text-blue-500">You</div><div class="text-xs">${order.deliveryAddress}</div>`);
    } else {
      customerMarkerRef.current.setLatLng(coords);
    }
  }, [order?.customerLat, order?.customerLng, isLiveTracking]);

  // Init rider coords from order when tracking starts
  useEffect(() => {
    if (isLiveTracking && order?.riderLat && order?.riderLng && !riderCoords) {
      setRiderCoords([order.riderLat, order.riderLng]);
    }
  }, [isLiveTracking, order?.riderLat, order?.riderLng]);

  // Socket: tracking + status + chat
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join_order_tracking", { orderId: Number(id) });

    socket.on("rider:location_updated", (data: { lat: number; lng: number }) => {
      setRiderCoords([data.lat, data.lng]);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/eta", id] });
    });

    socket.on("order_status", (data: { orderId: number; status: string }) => {
      if (data.orderId === Number(id)) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      }
    });

    return () => {
      socket.off("rider:location_updated");
      socket.off("order_status");
    };
  }, [socket, id, queryClient]);

  // Socket: chat events — join when tracking starts
  useEffect(() => {
    if (!socket || !id || !isLiveTracking) return;

    socket.emit("chat:join", { orderId: Number(id) });

    socket.on("chat:history", (messages: ChatMessage[]) => {
      setChatMessages(messages);
    });

    socket.on("chat:message", (message: ChatMessage) => {
      setChatMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.off("chat:history");
      socket.off("chat:message");
    };
  }, [socket, id, isLiveTracking]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Geocode customer address if no coords
  useEffect(() => {
    const geocode = async () => {
      if (order && !order.customerLat && order.deliveryAddress) {
        try {
          const q = `${order.deliveryAddress}, Ghana`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
          const data = await res.json();
          if (data?.[0]) {
            await api.patch(`/orders/${order.id}/customer-location`, {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
          }
        } catch { /* silent */ }
      }
    };
    geocode();
  }, [order?.id]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !socket || !id || !user) return;
    socket.emit("chat:send", {
      orderId: Number(id),
      text: chatInput.trim(),
      senderRole: user.role,
      senderName: user.name,
    });
    setChatInput("");
  }, [chatInput, socket, id, user]);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
        <p className="text-neutral-400 mb-4">Order not found</p>
        <button onClick={() => navigate("/orders")} className="text-orange-500 font-semibold">View Orders</button>
      </div>
    );
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);
  const riderName = order.rider?.name || "Your Rider";

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <AppHeader title={`Order #${String(order.id).padStart(5, "0")}`} showBack />

      <div className="flex-1 relative flex flex-col">

        {/* ── CANCELLED ── */}
        {isCancelled && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <X className="text-red-500" size={48} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Order Cancelled</h2>
            <p className="text-neutral-400 mt-2">Your order has been cancelled.</p>
            <Button onClick={() => navigate("/")} className="mt-8 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-wider">
              Back to Menu
            </Button>
          </div>
        )}

        {/* ── DELIVERED ── */}
        {isDelivered && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-28 h-28 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="text-emerald-500" size={56} />
            </motion.div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Delivered!</h2>
            <p className="text-neutral-400 mt-2 font-medium">Hope you enjoy your Fishing Panda meal!</p>
            <div className="mt-6 px-6 py-4 bg-neutral-900 rounded-2xl border border-white/10 text-left w-full max-w-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Order Total</p>
              <p className="text-2xl font-black text-white">GH₵{parseFloat(order.total).toFixed(2)}</p>
            </div>
            <Button onClick={() => navigate("/")} className="mt-6 w-full max-w-sm bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-wider h-14">
              Order Again
            </Button>
          </div>
        )}

        {/* ── PRE-PICKUP: status tracker (pending → assigned) ── */}
        {!isCancelled && !isDelivered && !isLiveTracking && (
          <div className="flex-1 flex flex-col px-5 py-6 space-y-6">
            {/* ETA bar */}
            <div className="bg-neutral-900 rounded-3xl border border-white/10 p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Status</p>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                  {STEPS.find(s => s.status === order.status)?.label || order.status}
                </h3>
                <p className="text-neutral-400 text-sm mt-1">
                  {STEPS.find(s => s.status === order.status)?.desc}
                </p>
              </div>
              <div className="w-14 h-14 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500">
                {STEPS.find(s => s.status === order.status)?.icon}
              </div>
            </div>

            {/* Progress steps */}
            <div className="bg-neutral-900 rounded-3xl border border-white/10 p-5 space-y-0">
              {STEPS.filter(s => s.status !== "cancelled").map((step, idx) => {
                const stepIdx = STATUS_ORDER.indexOf(step.status);
                const isDone = stepIdx < currentStatusIdx;
                const isCurrent = stepIdx === currentStatusIdx;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step.status} className="flex items-stretch gap-4">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                        isDone ? "bg-orange-600 text-white" :
                        isCurrent ? "bg-orange-600/20 border-2 border-orange-600 text-orange-500" :
                        "bg-neutral-800 text-neutral-600"
                      )}>
                        {isDone ? <CheckCircle2 size={16} /> : <div className={cn("w-2 h-2 rounded-full", isCurrent ? "bg-orange-500 animate-pulse" : "bg-neutral-600")} />}
                      </div>
                      {!isLast && (
                        <div className={cn("w-0.5 flex-1 my-1 min-h-[20px]", isDone ? "bg-orange-600" : "bg-neutral-800")} />
                      )}
                    </div>
                    {/* Label */}
                    <div className={cn("pb-5 pt-1.5", isLast ? "pb-0" : "")}>
                      <p className={cn("text-sm font-bold", isDone || isCurrent ? "text-white" : "text-neutral-600")}>{step.label}</p>
                      {isCurrent && (
                        <p className="text-xs text-neutral-400 mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="bg-neutral-900 rounded-3xl border border-white/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Order Summary</p>
              <div className="space-y-1.5">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-neutral-300">{item.quantity}× {item.name}</span>
                    <span className="text-neutral-400">GH₵{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-black text-white">
                  <span>Total</span>
                  <span>GH₵{parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE TRACKING (picked_up) ── */}
        {isLiveTracking && (
          <>
            {/* Map */}
            <div className="flex-1 min-h-[50vh] relative z-0 bg-neutral-900">
              <div ref={mapContainerRef} className="w-full h-[50vh] min-h-[400px]" />
              {/* Floating buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={() => navigate("/orders")}
                  className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => {}}
                  className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            {/* Bottom card */}
            <div className="bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 p-5 space-y-4 relative z-10 rounded-t-3xl -mt-6 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
              {/* ETA row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Live Tracking</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Out for Delivery</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1 text-neutral-400">
                    <Clock size={13} />
                    <span className="text-[10px] font-black uppercase tracking-widest">ETA</span>
                  </div>
                  <p className="text-2xl font-black text-white tabular-nums">
                    {eta ? `${eta.minutes} MIN` : "-- MIN"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStatusIdx / (STEPS.length - 1)) * 100}%` }}
                  className="h-full bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.8)] rounded-full"
                />
              </div>

              {/* Rider + Chat */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-600/20 rounded-2xl border border-orange-600/30 flex items-center justify-center">
                    <Bike className="text-orange-500" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Your Rider</p>
                    <p className="text-base font-black text-white tracking-tight">{riderName}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsChatOpen(true)}
                  className="rounded-2xl h-12 px-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Message
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── CHAT OVERLAY ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-neutral-950"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
                  <Bike className="text-orange-500" size={20} />
                </div>
                <div>
                  <p className="font-black text-white text-sm tracking-tight">{riderName}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-emerald-400 font-semibold">On the way to you</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-4">
                    <Bike className="text-neutral-600" size={28} />
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">No messages yet</p>
                  <p className="text-neutral-600 text-xs mt-1">Send a message to your rider</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.senderRole === user?.role && msg.senderRole === "customer";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl",
                      isMe
                        ? "bg-orange-600 text-white rounded-br-sm"
                        : "bg-neutral-800 text-neutral-100 rounded-bl-sm"
                    )}>
                      {!isMe && (
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={cn("text-[10px] mt-1", isMe ? "text-orange-200" : "text-neutral-500")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/10 bg-neutral-900 flex gap-3 items-center">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message your rider..."
                className="flex-1 bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-12 focus-visible:ring-orange-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="w-12 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 shrink-0 p-0 flex items-center justify-center"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackingPage;
