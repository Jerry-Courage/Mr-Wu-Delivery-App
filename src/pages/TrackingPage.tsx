import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Share2, Phone, MapPin } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { api } from "@/lib/api";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface OrderDetail {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  notes?: string | null;
  items: OrderItem[];
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

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", id],
    queryFn: () => api.get(`/orders/${id}`),
    refetchInterval: 10000,
    enabled: !!id,
  });

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

  return (
    <div className="pb-28">
      <AppHeader title={`Order #${String(order.id).padStart(5, "0")}`} showBack />

      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4 md:pt-4">
        <div>
          {/* Status Banner */}
          <div className="mx-4 md:mx-0 mt-4 bg-primary rounded-2xl p-4 text-primary-foreground">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase opacity-80">Current Status</span>
              <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                {order.status === "delivered" ? "✓ Complete" : "Live"}
              </span>
            </div>
            <h2 className="text-xl font-bold">
              {STEPS.find(s => s.status === order.status)?.label || order.status}
            </h2>
            <p className="text-sm opacity-80 mt-0.5">
              {STEPS.find(s => s.status === order.status)?.desc}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 opacity-70" />
              <p className="text-xs opacity-70 truncate">{order.deliveryAddress}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mx-4 md:mx-0 mt-4 bg-card border border-border rounded-2xl p-4">
            <h4 className="font-bold text-foreground text-sm mb-3">Order Summary</h4>
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-0.5">
                <span className="text-foreground">{item.quantity}× {item.name}</span>
                <span className="text-muted-foreground">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          {/* Progress Steps */}
          <div className="mx-4 md:mx-0 mt-4 bg-card border border-border rounded-2xl p-4">
            <h4 className="font-bold text-foreground text-sm mb-4">Order Progress</h4>
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const stepIdx = STATUS_ORDER.indexOf(step.status);
                const done = stepIdx <= currentStatusIdx;
                const active = stepIdx === currentStatusIdx;
                return (
                  <div key={step.status} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 transition-colors ${done ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                      {i < STEPS.length - 1 && <div className={`w-0.5 h-6 transition-colors ${done ? "bg-primary" : "bg-border"}`} />}
                    </div>
                    <div className="-mt-0.5">
                      <p className={`text-sm font-semibold ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground">
            <Share2 className="w-4 h-4" /> Share ETA
          </button>
          <button onClick={() => navigate("/help")} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground">
            <Phone className="w-4 h-4" /> Help
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
