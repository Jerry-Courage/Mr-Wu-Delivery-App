import { useState } from "react";
import { Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { menuItems, categories } from "@/data/menuData";
import { useCart } from "@/context/CartContext";

const MenuPage = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState("All");
  const [aiSuggestions, setAiSuggestions] = useState(true);

  const filtered = activeCategory === "All" ? menuItems : menuItems.filter(i => i.category === activeCategory);
  const aiPick = menuItems.find(i => i.aiMatch);

  return (
    <div className="pb-4">
      <AppHeader title="Menu - Midtown East" showBack />

      {/* Category Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground">Dietary</button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          AI Suggestions
          <button
            onClick={() => setAiSuggestions(!aiSuggestions)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center ${aiSuggestions ? "bg-primary justify-end" : "bg-muted justify-start"}`}
          >
            <div className="w-5 h-5 bg-card rounded-full mx-0.5 shadow" />
          </button>
        </label>
      </div>

      {/* AI Pick */}
      {aiSuggestions && aiPick && (
        <div className="mx-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-foreground">AI Picks for You</h3>
          </div>
          <button
            onClick={() => navigate(`/item/${aiPick.id}`)}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3"
          >
            <img src={aiPick.image} alt={aiPick.name} className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{aiPick.name}</span>
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">{aiPick.aiMatch}% Match</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-0.5">"Based on your love for crispy poultry and sweet hoisin sauce."</p>
            </div>
          </button>
        </div>
      )}

      {/* Popular Items - responsive grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Popular Items</h3>
          <button className="text-sm text-primary font-medium">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left"
            >
              <div className="relative flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" loading="lazy" />
                {item.isTop && (
                  <span className="absolute top-1 left-1 bg-gold text-gold-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">⭐ TOP</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.tags?.map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">🔥 {tag}</span>
                  ))}
                  {item.calories && <span className="text-[10px] text-muted-foreground">{item.calories} kcal</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-bold text-primary">${item.price.toFixed(2)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); addItem(item); }}
                  className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
