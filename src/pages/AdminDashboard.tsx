import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2, 
  Sparkles,
  DollarSign,
  ShoppingBag,
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
  UserPlus,
  ShieldCheck,
  Mail,
  KeyRound
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type AdminStats = {
  revenue: { date: string; amount: number }[];
  orders: { date: string; count: number }[];
  popularItems: { name: string; count: number }[];
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
};

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  isAvailable: number;
  imageUrl: string;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "menu" | "ai" | "staff">("overview");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get("/admin/stats"),
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["admin", "menu"],
    queryFn: () => api.get("/admin/menu-items"),
  });

  const { data: insightsData, isLoading: insightsLoading, refetch: getInsights } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => api.post("/ai/admin-insights", { days: 30 }),
    enabled: false
  });

  const { data: staff, isLoading: staffLoading } = useQuery<{id: number, email: string, name: string, createdAt: string}[]>({
    queryKey: ["admin", "staff"],
    queryFn: () => api.get("/admin/staff"),
    enabled: activeTab === "staff"
  });

  const createStaffMutation = useMutation({
    mutationFn: (data: typeof newStaff) => api.post("/admin/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast({ title: "Staff account created successfully" });
      setIsAddingStaff(false);
      setNewStaff({ name: "", email: "", password: "" });
    },
    onError: (err: any) => {
      toast({ 
        title: "Failed to create staff", 
        description: err.message,
        variant: "destructive" 
      });
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast({ title: "Staff member removed" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      toast({ title: "Item deleted" });
    }
  });

  if (statsLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-neutral-400 animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex pb-20 lg:pb-0 lg:pl-64">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-neutral-900 border-r border-white/5 hidden lg:flex flex-col p-6 space-y-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">Super Admin</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Oversight", icon: LayoutDashboard },
            { id: "menu", label: "Menu Editor", icon: UtensilsCrossed },
            { id: "staff", label: "Staff Control", icon: ShieldCheck },
            { id: "ai", label: "AI Consultant", icon: Sparkles },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-lg shadow-white/5" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5 h-20 flex items-center justify-around px-6 lg:hidden z-50">
        {[
          { id: "overview", icon: LayoutDashboard },
          { id: "menu", icon: UtensilsCrossed },
          { id: "staff", icon: ShieldCheck },
          { id: "ai", icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "p-3 rounded-2xl transition-all",
              activeTab === tab.id ? "bg-orange-500 text-white" : "text-neutral-500"
            )}
          >
            <tab.icon size={24} />
          </button>
        ))}
      </nav>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === "overview" && "Performance Oversight"}
              {activeTab === "menu" && "Menu Management"}
              {activeTab === "staff" && "Administrative Control"}
              {activeTab === "ai" && "AI Business Strategy"}
            </h2>
            <p className="text-neutral-400 mt-1">
              {activeTab === "staff" ? "Manage kitchen personnel and access" : "Real-time restaurant operations & growth data"}
            </p>
          </div>
          {activeTab === "menu" && (
            <Button className="h-12 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 gap-2">
              <Plus size={20} /> Add New Dish
            </Button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Revenue", value: `$${stats?.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400", trend: "+12.5%" },
                  { label: "Total Orders", value: stats?.totalOrders, icon: ShoppingBag, color: "text-blue-400", trend: "+8.2%" },
                  { label: "Active Customers", value: stats?.activeUsers || 0, icon: Users, color: "text-purple-400", trend: "+5.1%" },
                ].map((stat, i) => (
                  <Card key={i} className="bg-neutral-900 border-white/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-3 rounded-xl bg-white/5", stat.color)}>
                        <stat.icon size={20} />
                      </div>
                      <span className="text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-1 rounded-full">{stat.trend}</span>
                    </div>
                    <div>
                      <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                      <h4 className="text-3xl font-bold mt-1 text-white">{stat.value}</h4>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Revenue Chart */}
              <Card className="bg-neutral-900 border-white/5 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Revenue Insight (30 Days)</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <div className="w-2 h-2 rounded-full bg-orange-500" /> Revenue
                    </span>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.revenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Popular Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-neutral-900 border-white/5 p-6">
                  <h3 className="text-xl font-bold mb-6">Popular Dishes</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={stats?.popularItems}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={12} width={100} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {stats?.popularItems.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#ea580c" : "#404040"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-neutral-900 border-white/5 p-6 flex flex-col justify-center text-center space-y-6">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="text-orange-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Unleash AI Insights</h3>
                    <p className="text-neutral-400 mt-2">Get strategic recommendations based on current trends and operational data.</p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab("ai")}
                    className="h-12 w-full max-w-xs mx-auto rounded-xl bg-white text-black font-semibold hover:bg-neutral-200"
                  >
                    View Strategy
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === "staff" && (
            <motion.div 
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-3 rounded-xl">
                    <Users className="text-orange-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Kitchen Staff</h3>
                    <p className="text-sm text-neutral-500">{staff?.length || 0} active accounts</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsAddingStaff(true)}
                  className="bg-orange-600 hover:bg-orange-700 rounded-xl gap-2"
                >
                  <UserPlus size={18} /> Onboard Staff
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {isAddingStaff && (
                    <motion.div
                      key="add-staff-form"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className="bg-neutral-900 border-orange-500/50 p-6 space-y-4 shadow-xl shadow-orange-500/5">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-orange-500 flex items-center gap-2">
                            <UserPlus size={16} /> New Staff Account
                          </h4>
                          <button onClick={() => setIsAddingStaff(false)} className="text-neutral-500 hover:text-white transition-colors">
                             <Plus className="rotate-45" size={20} />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Full Name</label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                              <input 
                                value={newStaff.name}
                                onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                                type="text" 
                                placeholder="e.g. Master Chef" 
                                className="w-full bg-neutral-800 border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                              <input 
                                value={newStaff.email}
                                onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                                type="email" 
                                placeholder="chef@mrwu.com" 
                                className="w-full bg-neutral-800 border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Temporary Password</label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                              <input 
                                value={newStaff.password}
                                onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full bg-neutral-800 border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <Button 
                            onClick={() => createStaffMutation.mutate(newStaff)}
                            disabled={createStaffMutation.isPending || !newStaff.email || !newStaff.password || !newStaff.name}
                            className="w-full bg-orange-600 hover:bg-orange-700 h-10 rounded-xl font-bold"
                          >
                            {createStaffMutation.isPending ? <Loader2 className="animate-spin" /> : "Complete Onboarding"}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {staff?.map((s) => (
                  <Card key={s.id} className="bg-neutral-900 border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-colors group">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl font-bold group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                          {s.name[0]}
                        </div>
                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-500/20">
                          Active
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{s.name}</h4>
                        <p className="text-sm text-neutral-500 truncate">{s.email}</p>
                      </div>
                      <div className="text-[10px] text-neutral-600 uppercase tracking-widest">
                        Member since {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "New Member"}
                      </div>
                    </div>
                    <div className="pt-6">
                      <Button 
                        variant="ghost" 
                        onClick={() => deleteStaffMutation.mutate(s.id)}
                        disabled={deleteStaffMutation.isPending}
                        className="w-full h-10 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl gap-2 font-medium"
                      >
                        <Trash2 size={16} /> Remove Access
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {staff?.length === 0 && !isAddingStaff && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Users className="text-neutral-700" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-400">No kitchen staff onboarded</h4>
                    <p className="text-sm text-neutral-600 max-w-xs mx-auto mt-2">Start by creating accounts for your chefs and kitchen managers.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "menu" && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {menuItems?.map((item) => (
                <Card key={item.id} className="bg-neutral-900 border-white/5 overflow-hidden group">
                  <div className="aspect-video relative overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-red-500 text-[10px] font-bold uppercase tracking-wider">Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{item.name}</h4>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{item.category}</p>
                      </div>
                      <span className="font-bold text-orange-500">${item.price}</span>
                    </div>
                    <p className="text-sm text-neutral-400 line-clamp-2">{item.description}</p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-10 rounded-xl">
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button 
                        onClick={() => deleteMutation.mutate(item.id)}
                        variant="destructive" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8 py-10"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/20">
                  <Sparkles className="text-white" size={40} />
                </div>
                <h2 className="text-4xl font-bold">AI Business Consultant</h2>
                <p className="text-neutral-400">Analyzing 30-day performance data to generate growth strategies.</p>
              </div>

              {!insightsData ? (
                <Button 
                   onClick={() => getInsights()}
                   disabled={insightsLoading}
                   className="w-full h-16 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all font-bold text-lg gap-3"
                >
                  {insightsLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {insightsLoading ? "Analyzing Trends..." : "Generate 30-Day Insights"}
                </Button>
              ) : (
                <Card className="bg-neutral-900 border-orange-500/30 p-8 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="flex items-center gap-4 text-orange-500">
                    <TrendingUp size={28} />
                    <h3 className="font-bold text-xl">Strategic Insights</h3>
                  </div>
                  <div className="space-y-4 text-neutral-200 leading-relaxed text-lg italic">
                    {insightsData.insights}
                  </div>
                  <div className="pt-6 border-t border-white/5 flex gap-4">
                    <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Confidence</p>
                      <p className="text-sm font-bold">98% High</p>
                    </div>
                    <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Focus Area</p>
                      <p className="text-sm font-bold">Upsell / Loyalty</p>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    onClick={() => getInsights()} 
                    className="text-orange-500 hover:text-orange-400 p-0 h-auto font-semibold gap-2"
                  >
                    Refresh Analysis <ChevronRight size={16} />
                  </Button>
                </Card>
              )}

              <div className="flex items-start gap-4 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                <AlertCircle className="text-blue-400 shrink-0" size={24} />
                <p className="text-sm text-blue-200/70">
                  Our AI models analyze historical order patterns, temporal demand fluctuations, and popular item correlations.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
