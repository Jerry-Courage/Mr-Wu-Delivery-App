import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingCart, Star, Zap, Leaf, AlertTriangle } from "lucide-react";
import { menuItems } from "@/data/menuData";
import { useCart } from "@/context/CartContext";
import springRolls from "@/assets/spring-rolls.jpg";
import sichuanNoodles from "@/assets/sichuan-noodles.jpg";
import ThemeToggle from "@/components/ThemeToggle";

const sizes = [
  { label: "Regular Portion", price: 0 },
  { label: "Large Family Size", price: 3.50 },
  { label: "Small Lunch Bowl", price: -2.00 },
];

const spiceLevels = [1, 2, 3, 4];
const extras = [
  { label: "Double Protein", price: 4.50 },
  { label: "Extra Sauce", price: 1.00 },
  { label: "Bok Choy", price: 2.00 },
];

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const item = menuItems.find(i => i.id === id);

  const [selectedSize, setSelectedSize] = useState(0);
  const [spiceLevel, setSpiceLevel] = useState(2);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (!item) return <div className="p-8 text-center text-muted-foreground">Item not found</div>;

  const extrasCost = selectedExtras.reduce((sum, i) => sum + extras[i].price, 0);
  const totalPrice = (item.price + sizes[selectedSize].price + extrasCost) * quantity;

  const handleAddToCart = () => {
    addItem(item, quantity);
    navigate(-1);
  };

  return (
    <div className="pb-24">
      {/* Image */}
      <div className="relative md:flex md:gap-6 md:p-4">
        <div className="relative md:w-1/2 md:rounded-2xl md:overflow-hidden">
          <img src={item.image} alt={item.name} className="w-full h-56 md:h-80 object-cover md:rounded-2xl" />
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 bg-card/80 backdrop-blur rounded-full flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => navigate("/checkout")} className="w-9 h-9 bg-card/80 backdrop-blur rounded-full flex items-center justify-center relative">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              )}
            </button>
          </div>
          {item.isTop && (
            <span className="absolute bottom-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg">Best Seller</span>
          )}
        </div>

        {/* Info - on desktop, right side of image */}
        <div className="px-4 pt-4 md:w-1/2 md:px-0 md:pt-0">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-foreground">{item.name}</h1>
            <span className="text-xl font-bold text-primary">${item.price.toFixed(2)}</span>
          </div>
          {item.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-gold fill-current" />
              <span className="text-sm font-medium text-foreground">{item.rating}</span>
              <span className="text-sm text-muted-foreground">({item.reviews}+ reviews)</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.description}</p>

          {/* Nutrition tags */}
          <div className="flex gap-4 mt-4">
            {item.calories && (
              <div className="flex flex-col items-center gap-1">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">CALORIES</span>
                <span className="text-xs font-semibold text-foreground">{item.calories} kcal</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <Leaf className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">DIETARY</span>
              <span className="text-xs font-semibold text-foreground">GF Option</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">ALLERGENS</span>
              <span className="text-xs font-semibold text-foreground">Soy, Nuts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customization - two column on desktop */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          {/* Size Selection */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-1">Choose Size <span className="text-primary text-sm">* Required</span></h3>
            <div className="space-y-2 mt-2">
              {sizes.map((size, i) => (
                <button
                  key={size.label}
                  onClick={() => setSelectedSize(i)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    selectedSize === i ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSize === i ? "border-primary" : "border-muted-foreground"}`}>
                      {selectedSize === i && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <span className={`text-sm ${selectedSize === i ? "font-semibold text-primary" : "text-foreground"}`}>{size.label}</span>
                  </div>
                  {size.price !== 0 && (
                    <span className="text-sm text-muted-foreground">{size.price > 0 ? "+" : ""}${size.price.toFixed(2)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Spice Level */}
          <div className="px-4 md:px-0 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Spice Intensity</h3>
              <span className="text-sm text-primary font-medium">Medium</span>
            </div>
            <div className="flex gap-2 mt-2">
              {spiceLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setSpiceLevel(level)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    spiceLevel >= level ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  🔥 {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 italic">Level 4 uses authentic Ghost Pepper extract. Proceed with caution!</p>
          </div>
        </div>

        <div>
          {/* Extras */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-2">Enhance Your Meal</h3>
            <div className="space-y-2">
              {extras.map((extra, i) => (
                <button
                  key={extra.label}
                  onClick={() => setSelectedExtras(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedExtras.includes(i) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                      {selectedExtras.includes(i) && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-foreground">{extra.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">+${extra.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-2">Special Instructions</h3>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. No onions, sauce on the side..."
              className="w-full border border-border rounded-xl p-3 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none h-20"
            />
          </div>
        </div>
      </div>

      {/* AI Recommended Sides */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-secondary" />
          <h3 className="font-bold text-foreground">AI Recommended Sides</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Perfectly pairs with your selection</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ name: "Hand-pulled Noodles", price: 4.50, img: sichuanNoodles, tag: "AI Match" },
            { name: "Crispy Spring Rolls", price: 5.95, img: springRolls, tag: "Most Popular" }].map(side => (
            <div key={side.name}>
              <div className="relative rounded-xl overflow-hidden h-24">
                <img src={side.img} alt={side.name} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">{side.tag}</span>
              </div>
              <p className="text-xs font-semibold text-foreground mt-1.5">{side.name}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold text-primary">${side.price.toFixed(2)}</span>
                <button className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-sm leading-none">+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-primary font-semibold uppercase">Total Price</p>
            <p className="text-xl font-bold text-foreground">${totalPrice.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
            <button onClick={handleAddToCart} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
