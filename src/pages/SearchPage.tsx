import { useState } from "react";
import { ChevronLeft, Search, Mic, Plus, ArrowRight, ShoppingCart, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { menuItems } from "@/data/menuData";
import sichuanNoodles from "@/assets/sichuan-noodles.jpg";
import szechuanBeef from "@/assets/szechuan-beef.jpg";

const recentSearches = ["Sweet & Sour Pork", "Vegetarian Dumplings", "Spicy Noodles"];
const aiSuggestions = ["Something spicy for lunch", "Vegan options near me"];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
  results?: { name: string; price: number; image: string; tag?: string }[];
}

const SearchPage = () => {
  const navigate = useNavigate();
  const { totalItems, subtotal } = useCart();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "user",
      content: "Show me something spicy without peanuts, preferably noodles.",
      time: "12:01 PM",
    },
    {
      role: "assistant",
      content: "I've found a few spicy noodle dishes that are 100% peanut-free for you! Our Dan Dan Noodles can be prepared without peanuts upon request, but the Sichuan Chili Noodles are naturally peanut-free and very popular.",
      time: "12:01 PM",
      results: [
        { name: "Sichuan Chili Noodles", price: 14.50, image: sichuanNoodles, tag: "Peanut-Free" },
        { name: "Spicy Drunken Noodles", price: 13.95, image: szechuanBeef, tag: "15-20 min" },
      ],
    },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Smart Assistant</h1>
        <div className="w-6" />
      </header>

      {/* Search */}
      <div className="px-4 py-3 bg-card">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search menus or ask Mr Wu..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button><Mic className="w-4 h-4 text-primary" /></button>
        </div>

        {/* Recent */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {recentSearches.map(s => (
            <button key={s} className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground whitespace-nowrap">
              🕐 {s}
            </button>
          ))}
        </div>

        {/* AI Suggestions */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {aiSuggestions.map(s => (
            <button key={s} className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary whitespace-nowrap">
              ✨ {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-center text-xs text-muted-foreground">TODAY</p>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1">🤖</div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                    <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                    {msg.results && (
                      <div className="mt-3 space-y-2">
                        {msg.results.map(r => (
                          <div key={r.name} className="flex items-center gap-3 bg-muted rounded-xl p-2">
                            <img src={r.image} alt={r.name} className="w-14 h-14 rounded-lg object-cover" loading="lazy" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-foreground">{r.name}</h4>
                              <p className="text-sm font-bold text-primary">${r.price.toFixed(2)}</p>
                              {r.tag && <span className="text-[10px] text-muted-foreground">{r.tag}</span>}
                            </div>
                            <button className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 text-center">{msg.time}</p>
          </div>
        ))}

        <button className="flex items-center justify-center gap-1 mx-auto border border-border rounded-full px-4 py-2 text-sm text-foreground font-medium">
          View All Matches <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cart Bar */}
      {totalItems > 0 && (
        <div className="px-4 py-2 bg-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              </div>
              <div>
                <p className="text-xs opacity-70">Subtotal</p>
                <p className="font-bold">${subtotal.toFixed(2)}</p>
              </div>
            </div>
            <button onClick={() => navigate("/checkout")} className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl text-sm">View Cart</button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-2">
        <input placeholder="Ask follow-up questions..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <button><Mic className="w-5 h-5 text-muted-foreground" /></button>
        <button className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SearchPage;
