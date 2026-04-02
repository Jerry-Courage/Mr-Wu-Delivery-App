import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, MapPin, Clock, CreditCard, Smartphone, Heart } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";

const tipOptions = [15, 20, 25, 30];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [tipPercent, setTipPercent] = useState(20);
  const [paymentMethod, setPaymentMethod] = useState<"apple" | "visa">("apple");

  const deliveryFee = 3.99;
  const tip = subtotal * (tipPercent / 100);
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tip + tax;

  return (
    <div className="pb-28">
      <AppHeader title="Checkout" showBack />

      {/* Delivery / Pickup Toggle */}
      <div className="flex mx-4 mt-3 bg-muted rounded-xl p-1">
        {(["delivery", "pickup"] as const).map(type => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${
              orderType === type ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Desktop two-column layout */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        {/* Left: Items + Delivery */}
        <div>
          {/* Order Items */}
          <div className="px-4 md:px-0 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground">Your Order</h2>
              <button className="text-sm text-primary font-semibold">Add more</button>
            </div>
            <div className="space-y-3">
              {items.map(({ item, quantity }) => (
                <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.description?.slice(0, 30)}...</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary text-sm">${(item.price * quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-2 border border-border rounded-lg">
                        <button onClick={() => updateQuantity(item.id, quantity - 1)} className="p-1.5">
                          <Minus className="w-3.5 h-3.5 text-foreground" />
                        </button>
                        <span className="text-sm font-semibold text-foreground w-5 text-center">{quantity}</span>
                        <button onClick={() => updateQuantity(item.id, quantity + 1)} className="p-1.5">
                          <Plus className="w-3.5 h-3.5 text-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details */}
          {orderType === "delivery" && (
            <div className="px-4 md:px-0 mt-6">
              <h2 className="font-bold text-foreground mb-3">Delivery Details</h2>
              <div className="bg-muted rounded-xl overflow-hidden h-32 mb-3 flex items-center justify-center text-muted-foreground text-sm">
                🗺️ Map Preview
              </div>
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">742 Evergreen Terrace</p>
                  <p className="text-xs text-muted-foreground">Springfield, OR 97477</p>
                </div>
                <button className="text-sm text-primary font-semibold">Change</button>
              </div>
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <Clock className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Delivery Time</p>
                  <p className="text-xs text-muted-foreground">ASAP (35-45 mins)</p>
                </div>
                <button className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground">
                  <Clock className="w-3.5 h-3.5" /> Schedule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tip, Payment, Summary */}
        <div>
          {/* Driver Tip */}
          <div className="px-4 md:px-0 mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-foreground">Driver Tip</h2>
              <span className="font-bold text-foreground">${tip.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              {tipOptions.map(pct => (
                <button
                  key={pct}
                  onClick={() => setTipPercent(pct)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    tipPercent === pct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">100% of your tip goes to the delivery professional.</p>
          </div>

          {/* Payment Method */}
          <div className="px-4 md:px-0 mt-6">
            <h2 className="font-bold text-foreground mb-3">Payment Method</h2>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod("apple")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                  paymentMethod === "apple" ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Apple Pay</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "apple" ? "border-primary" : "border-muted-foreground"}`}>
                  {paymentMethod === "apple" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod("visa")}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                  paymentMethod === "visa" ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-foreground" />
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground">Visa ending in 4421</span>
                    <p className="text-xs text-muted-foreground">Expires 12/26</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "visa" ? "border-primary" : "border-muted-foreground"}`}>
                  {paymentMethod === "visa" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mx-4 md:mx-0 mt-6 bg-muted rounded-2xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span className="text-foreground">${deliveryFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated Tax</span><span className="text-foreground">${tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tip</span><span className="text-foreground">${tip.toFixed(2)}</span></div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase">TOTAL</p>
                  <p className="text-2xl font-bold text-foreground">${total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> AI ETA: 12:45 PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button className="flex items-center gap-1 text-primary text-sm font-semibold px-4">
            <Heart className="w-4 h-4" /> Save for Later
          </button>
          <button
            onClick={() => navigate("/tracking")}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm"
          >
            Place Order • ${total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
