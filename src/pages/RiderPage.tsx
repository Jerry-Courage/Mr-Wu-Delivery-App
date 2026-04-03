import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bike, MapPin, Phone, Package, LogOut, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";

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

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/rider/orders"],
    queryFn: () => api.get("/rider/orders"),
    refetchInterval: 10000,
    enabled: user?.role === "rider",
  });

  useEffect(() => {
    if (socket) {
      socket.on("order_assigned", (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
        toast({ 
          title: "🛵 New Delivery Assigned!", 
          description: `Order #${String(data.orderId).padStart(5, '0')} is ready for pickup.` 
        });
      });
      return () => { socket.off("order_assigned"); };
    }
  }, [socket, queryClient, toast]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "picked_up" | "delivered" }) =>
      api.patch(`/rider/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/orders"] });
      toast({ title: "Order updated" });
    },
    onError: () => toast({ title: "Failed to update order", variant: "destructive" }),
  });

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const completed = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  const earnings = completed
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + parseFloat(o.total) * 0.1, 0);

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
          <button data-testid="button-refresh" onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button data-testid="button-logout" onClick={() => { logout(); navigate("/login"); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
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
          <p className="text-lg font-bold text-primary">${earnings.toFixed(2)}</p>
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
              return (
                <div key={order.id} data-testid={`card-order-${order.id}`} className="bg-card border border-border rounded-2xl overflow-hidden">
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
                      Total: ${parseFloat(order.total).toFixed(2)}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {order.status === "assigned" && (
                      <button
                        data-testid={`button-pickup-${order.id}`}
                        onClick={() => statusMutation.mutate({ id: order.id, status: "picked_up" })}
                        disabled={statusMutation.isPending}
                        className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60"
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {order.status === "picked_up" && (
                      <button
                        data-testid={`button-delivered-${order.id}`}
                        onClick={() => statusMutation.mutate({ id: order.id, status: "delivered" })}
                        disabled={statusMutation.isPending}
                        className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed orders */}
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
                    <p className="text-xs text-muted-foreground mt-0.5">${parseFloat(order.total).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiderPage;
