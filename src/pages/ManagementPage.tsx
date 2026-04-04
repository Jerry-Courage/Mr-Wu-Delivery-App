import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ChefHat, Clock, CheckCircle, Bike, Package, LogOut,
  RefreshCw, UserCheck, Sparkles, AlertTriangle, X, Flame
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Start Preparing",
  preparing: "Mark Ready",
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: "Pending",      color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20",   dot: "bg-amber-500" },
  confirmed: { label: "Confirmed",    color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-900/20",     dot: "bg-blue-500" },
  preparing: { label: "Preparing",    color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", dot: "bg-orange-500" },
  ready:     { label: "Ready",        color: "text-emerald-700 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-900/20",dot: "bg-emerald-500" },
  assigned:  { label: "Assigned",     color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20", dot: "bg-violet-500" },
  picked_up: { label: "Out for Delivery", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", dot: "bg-indigo-500" },
  delivered: { label: "Delivered",    color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",     dot: "bg-slate-400" },
  cancelled: { label: "Cancelled",    color: "text-red-700 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20",       dot: "bg-red-500" },
};

const FILTER_TABS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "confirmed",label: "Confirmed" },
  { key: "preparing",label: "Preparing" },
  { key: "ready",    label: "Ready" },
  { key: "assigned", label: "Assigned" },
  { key: "delivered",label: "Done" },
];

function getElapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

const ManagementPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
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
    enabled: user?.role === "kitchen",
  });

  const { data: riders = [] } = useQuery<Rider[]>({
    queryKey: ["/api/management/riders"],
    queryFn: () => api.get("/management/riders"),
    enabled: user?.role === "kitchen",
  });

  const { data: aiSummary, isLoading: aiLoading } = useQuery<{ summary: string }>({
    queryKey: ["/api/ai/kitchen-summary"],
    queryFn: () => api.get("/ai/kitchen-summary"),
    refetchInterval: 60000,
    retry: 1,
    enabled: user?.role === "kitchen",
  });

  useEffect(() => {
    if (!socket) return;
    socket.on("new_order", (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/kitchen-summary"] });
      toast({
        title: "New Order Received!",
        description: `Order #${String(data.orderId).padStart(5, "0")} just came in.`,
      });
    });
    return () => { socket.off("new_order"); };
  }, [socket, queryClient, toast]);

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
      toast({ title: "Rider assigned successfully" });
    },
    onError: () => toast({ title: "Failed to assign rider", variant: "destructive" }),
  });

  const counts: Record<string, number> = { all: orders.length };
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const filtered = (filter === "all" ? orders : orders.filter(o => o.status === filter))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const urgentCount = orders.filter(o =>
    !["delivered", "cancelled"].includes(o.status) && getElapsedMinutes(o.createdAt) > 15
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <ChefHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-foreground text-base leading-none">Kitchen</h1>
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" />{urgentCount} urgent
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => refetch()} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { logout(); navigate("/login"); }} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="px-4 pt-4 pb-3 grid grid-cols-4 gap-2">
        {[
          { label: "Pending",    key: "pending",   Icon: Clock,         color: "text-amber-500",   ring: "ring-amber-200 dark:ring-amber-800" },
          { label: "Cooking",    key: "preparing",  Icon: Flame,         color: "text-orange-500",  ring: "ring-orange-200 dark:ring-orange-800" },
          { label: "Ready",      key: "ready",      Icon: CheckCircle,   color: "text-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800" },
          { label: "En Route",   key: "picked_up",  Icon: Bike,          color: "text-indigo-500",  ring: "ring-indigo-200 dark:ring-indigo-800" },
        ].map(({ label, key, Icon, color, ring }) => (
          <div key={key} className={cn("bg-card rounded-2xl p-2.5 border border-border text-center ring-1", ring)}>
            <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
            <p className="text-lg font-black text-foreground leading-none">{counts[key] || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Briefing */}
      <div className="px-4 pb-3">
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">AI Kitchen Briefing</p>
            {aiLoading ? (
              <div className="space-y-1.5">
                <div className="h-3 bg-primary/10 animate-pulse rounded-full w-full" />
                <div className="h-3 bg-primary/10 animate-pulse rounded-full w-3/4" />
              </div>
            ) : (
              <p className="text-sm text-foreground leading-snug">{aiSummary?.summary || "Analysing kitchen status..."}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTER_TABS.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const cfg = key !== "all" ? STATUS_CONFIG[key as OrderStatus] : null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filter === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {cfg && <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />}
              {label}
              {count > 0 && (
                <span className={cn(
                  "min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center",
                  filter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="px-4 pb-10 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl h-44 animate-pulse border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No orders here</p>
            <p className="text-sm text-muted-foreground mt-1">Orders will appear as they come in</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((order, idx) => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed > 15 && !["delivered", "cancelled"].includes(order.status);
              const nextStatus = NEXT_STATUS[order.status];
              const canAssign = order.status === "ready" && !order.riderId;
              const cfg = STATUS_CONFIG[order.status];
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "bg-card rounded-2xl overflow-hidden border transition-all",
                    isUrgent ? "border-red-400 dark:border-red-600 shadow-[0_0_0_1px] shadow-red-200 dark:shadow-red-900" : "border-border"
                  )}
                >
                  {/* Urgent Banner */}
                  {isUrgent && (
                    <div className="flex items-center gap-2 bg-red-500 px-4 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      <p className="text-white text-xs font-bold">Waiting {elapsed} min — Needs attention!</p>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-black text-foreground text-base leading-none">
                          #{String(order.id).padStart(5, "0")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.customer.name} · {formattedTime}
                          {!isUrgent && (
                            <span className="ml-1 text-muted-foreground/60">· {elapsed}m ago</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full", cfg.bg, cfg.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-primary/10 text-primary text-xs font-bold rounded-md flex items-center justify-center">
                            {item.quantity}
                          </span>
                          <span className="text-foreground font-medium">{item.name}</span>
                          {item.specialInstructions && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 italic">({item.specialInstructions})</span>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          GH₵{(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">{order.notes}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">📍 {order.deliveryAddress}</p>
                      <p className="text-sm font-bold text-foreground">GH₵{parseFloat(order.total).toFixed(2)}</p>
                    </div>
                    {order.rider && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">🛵 {order.rider.name} assigned</p>
                    )}
                  </div>

                  {/* Actions */}
                  {(nextStatus || canAssign || (!["delivered", "cancelled", "picked_up", "assigned"].includes(order.status) && !nextStatus)) && (
                    <div className="px-4 pb-4 flex gap-2">
                      {nextStatus && (
                        <button
                          onClick={() => statusMutation.mutate({ id: order.id, status: nextStatus })}
                          disabled={statusMutation.isPending}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                        >
                          {NEXT_LABEL[order.status]}
                        </button>
                      )}
                      {canAssign && (
                        <button
                          onClick={() => setAssignModal({ orderId: order.id })}
                          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                          <UserCheck className="w-4 h-4" /> Assign Rider
                        </button>
                      )}
                      {order.status === "ready" && order.riderId && (
                        <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-4 h-4" /> Rider Assigned
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Assign Rider Modal */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setAssignModal(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
                <div>
                  <h3 className="font-bold text-foreground text-lg">Assign Rider</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Order #{String(assignModal.orderId).padStart(5, "0")}</p>
                </div>
                <button onClick={() => setAssignModal(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5">
                {riders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No riders registered yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {riders.map(rider => (
                      <label
                        key={rider.id}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border transition-all",
                          selectedRider === rider.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/50 hover:border-primary/40"
                        )}
                      >
                        <input
                          type="radio"
                          name="rider"
                          value={rider.id}
                          checked={selectedRider === rider.id}
                          onChange={() => setSelectedRider(rider.id)}
                          className="accent-primary"
                        />
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bike className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{rider.name}</p>
                          <p className="text-xs text-muted-foreground">{rider.phone || rider.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setAssignModal(null); setSelectedRider(""); }}
                    className="flex-1 border border-border text-foreground py-3 rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedRider || assignMutation.isPending}
                    onClick={() => selectedRider && assignMutation.mutate({ orderId: assignModal.orderId, riderId: selectedRider as number })}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold disabled:opacity-50 shadow-sm transition-colors"
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign Rider"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagementPage;
