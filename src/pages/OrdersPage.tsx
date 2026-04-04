import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Heart, ChevronDown, RotateCcw, Package } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  assigned: "Assigned",
  picked_up: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  assigned: "bg-purple-100 text-purple-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  delivered: "bg-muted text-foreground",
  cancelled: "bg-red-100 text-red-800",
};

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up"];

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    queryFn: () => api.get("/orders/my"),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (!user) {
    return (
      <div className="pb-4">
        <AppHeader title="Your Orders" />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground text-lg mb-2">Sign in to see your orders</h3>
          <p className="text-muted-foreground text-sm text-center mb-6">Track your deliveries and reorder your favorites</p>
          <button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="pb-4">
      <AppHeader title="Your Orders" />

      {isLoading ? (
        <div className="px-4 pt-8 text-center text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground text-lg mb-2">No orders yet</h3>
          <p className="text-muted-foreground text-sm text-center mb-6">Your order history will appear here</p>
          <button onClick={() => navigate("/menu")} className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl">
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          {activeOrders.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mt-5 mb-3 tracking-wider">Active Orders</h3>
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    onTrack={() => navigate(`/tracking/${order.id}`)}
                  />
                ))}
              </div>
            </>
          )}

          {pastOrders.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mt-5 mb-3 tracking-wider">Past Orders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    onReorder={() => navigate("/menu")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

function OrderCard({ order, expanded, onToggle, onTrack, onReorder }: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onTrack?: () => void;
  onReorder?: () => void;
}) {
  const displayName = order.items.length > 0
    ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ""}`
    : "Order";

  return (
    <div data-testid={`card-order-${order.id}`} className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">ORDER #{String(order.id).padStart(5, "0")}</p>
            <h4 className="font-semibold text-foreground text-sm mt-0.5">{displayName}</h4>
          </div>
          <Heart className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
          <span className="text-xs font-semibold text-foreground ml-auto">GH₵{parseFloat(order.total).toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-border">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-primary font-medium">
          <span>📋 View Receipt & Details</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="px-4 pb-3 space-y-1">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                <span>{item.quantity}× {item.name}</span>
                <span>GH₵{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">📍 {order.deliveryAddress}</p>
          </div>
        )}
      </div>

      {(onTrack || onReorder) && (
        <div className="border-t border-border flex">
          {onTrack && (
            <button onClick={onTrack} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-primary">
              📍 Track Order
            </button>
          )}
          {onReorder && (
            <button onClick={onReorder} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-foreground">
              <RotateCcw className="w-3.5 h-3.5" /> Reorder
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
