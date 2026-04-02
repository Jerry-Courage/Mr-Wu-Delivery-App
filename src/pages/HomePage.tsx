import { Search, Bell, ChevronRight, Plus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { menuItems } from "@/data/menuData";
import promoCombo from "@/assets/promo-combo.jpg";

const categories = [
  { icon: "🍲", label: "Combos" },
  { icon: "🍜", label: "Noodles" },
  { icon: "🍚", label: "Rice" },
  { icon: "🥬", label: "Veggie" },
  { icon: "🔔", label: "Specials" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const recommended = menuItems.slice(0, 2);
  const reorderItem = menuItems[0];

  return (
    <div className="pb-4">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Main St, 123</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/search")}><Search className="w-5 h-5 text-foreground" /></button>
          <button onClick={() => navigate("/help")}><Bell className="w-5 h-5 text-foreground" /></button>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hi, Alex! 👋</h1>
          <p className="text-muted-foreground text-sm">Hungry for some Mr Wu's?</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-secondary to-primary rounded-full" />
        </div>
      </div>

      {/* Fastest Delivery Banner */}
      <div className="mx-4 mb-4 bg-card border border-border rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary uppercase">Fastest Delivery</p>
          <p className="text-sm text-foreground">Mr Wu's Downtown • 12 mins</p>
        </div>
        <button className="text-primary text-sm font-semibold flex items-center">
          Change <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Recommendations */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-1">
            AI Recommendations <span className="text-secondary">⚡</span>
          </h2>
          <button className="text-sm text-primary font-medium">See All</button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {recommended.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex-shrink-0 w-44"
            >
              <div className="relative rounded-xl overflow-hidden h-32">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                {item.isTop && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">Most Popular</span>
                )}
                {item.tags?.includes("Spicy") && (
                  <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">🔥 Spicy</span>
                )}
                <div className="absolute bottom-2 left-2 text-primary-foreground text-xs">
                  ⭐ {item.rating} • 20-30 min
                </div>
              </div>
              <div className="mt-2 flex items-start justify-between">
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground truncate w-32">{item.name}</p>
                  <p className="text-sm font-bold text-primary">${item.price.toFixed(2)}</p>
                </div>
                <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="flex justify-around px-4 mb-5">
        {categories.map(c => (
          <button key={c.label} onClick={() => navigate("/menu")} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl">{c.icon}</div>
            <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Promo Banner */}
      <div className="mx-4 mb-5 bg-primary rounded-2xl overflow-hidden relative">
        <div className="p-5 pr-32">
          <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-md">Weekend Special</span>
          <h3 className="text-xl font-bold text-primary-foreground mt-2">Get 30% Off Your First Combo!</h3>
          <p className="text-primary-foreground/80 text-xs mt-1">Valid until Sunday. Use code: WUFIRST30</p>
          <button className="mt-3 bg-card text-primary text-sm font-bold px-4 py-2 rounded-lg">Order Now</button>
        </div>
        <img src={promoCombo} alt="Promo" className="absolute right-2 bottom-2 w-24 h-24 rounded-xl object-cover" loading="lazy" />
      </div>

      {/* Pick Up Where You Left Off */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Pick Up Where You Left Off</h2>
          <button className="text-sm text-muted-foreground">History</button>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <img src={reorderItem.image} alt={reorderItem.name} className="w-14 h-14 rounded-lg object-cover" loading="lazy" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Mr Wu's - Downtown</p>
            <p className="text-xs text-muted-foreground truncate">Beef Broccoli, Veggie R...</p>
            <p className="text-xs text-primary mt-0.5">Last Tuesday</p>
          </div>
          <button className="border border-primary text-primary text-xs font-bold px-3 py-1.5 rounded-lg">Reorder</button>
        </div>
      </div>

      {/* Start New Order */}
      <div className="px-4">
        <button
          onClick={() => navigate("/menu")}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Start New Order
        </button>
      </div>
    </div>
  );
};

export default HomePage;
