import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Phone, MapPin, Sparkles, Navigation, Clock, Bike } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { api } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { Card } from "@/components/ui/card";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Icons
const riderIcon = L.divIcon({
  className: 'custom-rider-icon',
  html: `<div class="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.8)] border-2 border-white animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bike"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const customerIcon = L.divIcon({
  className: 'custom-customer-icon',
  html: `<div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.8)] border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
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
}

interface AIEta {
  minutes: number;
  message: string;
}

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "pending", label: "Order Placed", desc: "Your order has been received" },
  { status: "confirmed", label: "Confirmed", desc: "Restaurant confirmed your order" },
  { status: "preparing", label: "Preparing", desc: "Kitchen is preparing your food" },
  { status: "ready", label: "Ready", desc: "Food is ready for pickup" },
  { status: "assigned", label: "Rider Assigned", desc: "A rider is on the way to pick up" },
  { status: "picked_up", label: "Out for Delivery", desc: "Your food is on the way!" },
  { status: "delivered", label: "Delivered", desc: "Enjoy your meal!" },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "delivered"];

const TrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
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
    enabled: !!id && !!order && order.status !== "delivered",
    refetchInterval: 60000,
    retry: 1,
  });

  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && order) {
      const initialCenter = riderCoords || [order.customerLat || 5.6037, order.customerLng || -0.1870];
      
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(initialCenter, 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id]); // Only re-init if order ID changes

  // Update Rider Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !riderCoords) return;

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker(riderCoords, { icon: riderIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('<div class="font-bold text-orange-500">Mr Wu Rider</div><div class="text-xs">Approaching...</div>');
    } else {
      riderMarkerRef.current.setLatLng(riderCoords);
    }
    
    mapInstanceRef.current.flyTo(riderCoords, 15, { duration: 1.5 });
  }, [riderCoords]);

  // Update Customer Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !order?.customerLat || !order?.customerLng) return;

    const coords: [number, number] = [order.customerLat, order.customerLng];
    if (!customerMarkerRef.current) {
      customerMarkerRef.current = L.marker(coords, { icon: customerIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div class="font-bold text-blue-500">You</div><div class="text-xs">${order.deliveryAddress}</div>`);
    } else {
      customerMarkerRef.current.setLatLng(coords);
    }
  }, [order?.customerLat, order?.customerLng]);

  // Socket Listeners for Real-time Updates
  useEffect(() => {
    if (socket && id) {
      socket.emit("join_order_tracking", { orderId: Number(id) });

      socket.on("rider:location_updated", (data: { lat: number; lng: number }) => {
        setRiderCoords([data.lat, data.lng]);
        queryClient.invalidateQueries({ queryKey: ["/api/ai/eta", id] });
      });

      socket.on("order_status", (data) => {
        if (data.orderId === Number(id)) {
          queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
        }
      });

      return () => {
        socket.off("rider:location_updated");
        socket.off("order_status");
      };
    }
  }, [socket, id, queryClient]);

  // Handle Geocoding of Customer Address if not set
  useEffect(() => {
    const geocodeAddress = async () => {
      if (order && !order.customerLat && order.deliveryAddress) {
        try {
          // Simple Nominatim fetch (Limit to Ghana)
          const q = `${order.deliveryAddress}, Ghana`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
          const data = await res.json();
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            await api.patch(`/orders/${order.id}/customer-location`, { lat, lng });
            queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
      }
    };
    geocodeAddress();
  }, [order, id, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <button onClick={() => navigate("/orders")} className="text-primary font-semibold">View Orders</button>
      </div>
    );
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);
  const showMap = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <AppHeader title={`Order #${String(order.id).padStart(5, "0")}`} showBack />

      <div className="flex-1 relative flex flex-col">
        {/* Map View */}
        <div className="flex-1 min-h-[400px] relative z-0 bg-neutral-900 overflow-hidden">
          {showMap ? (
            <div 
              ref={mapContainerRef} 
              className="w-full h-[50vh] min-h-[400px] z-0" 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-neutral-900/50 backdrop-blur-xl">
               <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="text-emerald-500" size={48} />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Delivery Complete</h2>
               <p className="text-neutral-400 mt-2 font-medium">Hope you enjoyed your Mr Wu meal!</p>
            </div>
          )}

          {/* Floating Action Overlay (Sharing/Help) */}
          <div className="absolute top-6 right-6 flex flex-col gap-3 z-10">
             <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                <Share2 size={20} />
             </button>
             <button onClick={() => navigate("/help")} className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                <Phone size={20} />
             </button>
          </div>
        </div>

        {/* Bottom Status Card */}
        <div className="bg-neutral-900/80 backdrop-blur-2xl border-t border-white/10 p-6 md:p-8 space-y-6 relative z-10 -mt-10 mx-4 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
           <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Live Delivery</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">
                  {STEPS.find(s => s.status === order.status)?.label || order.status}
                </h3>
              </div>
              <div className="text-right">
                 <div className="flex items-center gap-2 justify-end mb-1 text-neutral-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">ETA</span>
                 </div>
                 <p className="text-2xl font-black text-white tabular-nums">
                    {eta ? `${eta.minutes} MIN` : "-- MIN"}
                 </p>
              </div>
           </div>

           {/* Progress Bar (Modern Slim) */}
           <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStatusIdx / (STEPS.length - 1)) * 100}%` }}
                className="absolute top-0 left-0 h-full bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.8)]"
              />
           </div>

           <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                    <Bike className="text-orange-500" size={28} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Your Rider</p>
                    <p className="text-lg font-black text-white tracking-tight">Kojo Mensah</p>
                 </div>
              </div>
              <Button 
                variant="outline" 
                className="rounded-2xl h-14 px-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/50 text-white font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Message
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
