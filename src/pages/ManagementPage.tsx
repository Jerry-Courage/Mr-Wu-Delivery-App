import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChefHat, Clock, CheckCircle, Bike, Package, LogOut, RefreshCw, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface Rider { id: number; name: string; email: string; phone?: string | null }
interface OrderItem { id: number; name: string; quantity: number; price: string; specialInstructions?: string | null }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  notes?: string | null;
  riderId?: number | null;
  items: OrderItem[];
  customer: { id: number; name: string; email: string; phone?: string | null };
  rider?: { id: number; name: string } | null;
}

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "delivered"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  assigned: "Assigned",
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

const ManagementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [assignModal, setAssignModal] = useState<{ orderId: number } | null>(null);
  const [selectedRider, setSelectedRider] = useState<number | "">("");

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/management/orders"],
    queryFn: () => api.get("/management/orders"),
    refetchInterval: 15000,
  });

  const { data: riders = [] } = useQuery<Rider[]>({
    queryKey: ["/api/management/riders"],
    queryFn: () => api.get("/management/riders"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/management/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] });
      toast({ title: "Order updated" });
    },
    onError: () => toast({ title: "Failed to update order", variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: number; riderId: number }) =>
      api.patch(`/management/orders/${orderId}/assign`, { riderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] });
      setAssignModal(null);
      setSelectedRider("");
      toast({ title: "Rider assigned" });
    },
    onError: () => toast({ title: "Failed to assign rider", variant: "destructive" }),
  });

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts: Record<string, number> = { all: orders.length };
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const activeFilters: Array<{ key: OrderStatus | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "assigned", label: "Assigned" },
    { key: "delivered", label: "Delivered" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Kitchen Dashboard</h1>
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
      <div className="px-4 py-4 grid grid-cols-4 gap-3">
        {[
          { label: "Pending", key: "pending", icon: Clock, color: "text-yellow-600" },
          { label: "Preparing", key: "preparing", icon: ChefHat, color: "text-orange-600" },
          { label: "Ready", key: "ready", icon: CheckCircle, color: "text-green-600" },
          { label: "Out for Delivery", key: "picked_up", icon: Bike, color: "text-blue-600" },
        ].map(({ label, key, icon: Icon, color }) => (
          <div key={key} className="bg-card rounded-xl p-3 border border-border text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-foreground">{counts[key] || 0}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {activeFilters.map(({ key, label }) => (
          <button
            key={key}
            data-testid={`filter-${key}`}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {label} {counts[key] ? `(${counts[key]})` : ""}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 pb-8 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No orders here</p>
          </div>
        ) : (
          filtered.map(order => {
            const nextStatus = NEXT_STATUS[order.status];
            const canAssign = order.status === "ready" && !order.riderId;
            const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={order.id} data-testid={`card-order-${order.id}`} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Order Header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">#{String(order.id).padStart(5, "0")}</p>
                    <p className="text-xs text-muted-foreground">{order.customer.name} · {formattedTime}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-1">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.quantity}× {item.name}</span>
                      <span className="text-muted-foreground">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Note: {order.notes}</p>
                  )}
                  <div className="pt-1 border-t border-border flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Address & Rider */}
                <div className="px-4 pb-3 text-xs text-muted-foreground">
                  <p>📍 {order.deliveryAddress}</p>
                  {order.rider && <p className="mt-0.5">🛵 {order.rider.name}</p>}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2 flex-wrap">
                  {nextStatus && (
                    <button
                      data-testid={`button-advance-${order.id}`}
                      onClick={() => statusMutation.mutate({ id: order.id, status: nextStatus })}
                      disabled={statusMutation.isPending}
                      className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-xl"
                    >
                      Mark {STATUS_LABELS[nextStatus]}
                    </button>
                  )}
                  {canAssign && (
                    <button
                      data-testid={`button-assign-${order.id}`}
                      onClick={() => setAssignModal({ orderId: order.id })}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-primary text-primary text-sm font-semibold py-2 rounded-xl"
                    >
                      <UserCheck className="w-4 h-4" /> Assign Rider
                    </button>
                  )}
                  {order.status !== "cancelled" && order.status !== "delivered" && !nextStatus && !canAssign && (
                    <button
                      onClick={() => statusMutation.mutate({ id: order.id, status: "cancelled" })}
                      className="px-4 border border-destructive text-destructive text-sm font-semibold py-2 rounded-xl"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Rider Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-foreground mb-4">Assign Rider</h3>
            {riders.length === 0 ? (
              <p className="text-muted-foreground text-sm mb-4">No riders available. Register a rider account first.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {riders.map(rider => (
                  <label key={rider.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl cursor-pointer">
                    <input
                      type="radio"
                      name="rider"
                      value={rider.id}
                      checked={selectedRider === rider.id}
                      onChange={() => setSelectedRider(rider.id)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="font-medium text-foreground text-sm">{rider.name}</p>
                      <p className="text-xs text-muted-foreground">{rider.phone || rider.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setAssignModal(null); setSelectedRider(""); }} className="flex-1 border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold">
                Cancel
              </button>
              <button
                disabled={!selectedRider || assignMutation.isPending}
                onClick={() => selectedRider && assignMutation.mutate({ orderId: assignModal.orderId, riderId: selectedRider as number })}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementPage;
