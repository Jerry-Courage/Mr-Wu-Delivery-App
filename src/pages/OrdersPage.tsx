import { useState } from "react";
import { Heart, ChevronDown, RotateCcw, Edit } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import generalTsos from "@/assets/general-tsos.jpg";
import soupDumplings from "@/assets/soup-dumplings.jpg";
import wholePekingDuck from "@/assets/whole-peking-duck.jpg";

const filters = ["All Time", "Last 30 Days", "Oct 2023", "Sep 2023"];

const orders = [
  { id: "WU-98231", name: "General Tso's Chicken +3", img: generalTsos, status: "Delivered", date: "Today, 12:45 PM", fav: true, section: "RECENT ACTIVITY" },
  { id: "WU-97554", name: "Shrimp Dumplings +3", img: soupDumplings, status: "Delivered", date: "Oct 24, 6:15 PM", fav: false, section: "EARLIER THIS MONTH" },
  { id: "WU-96112", name: "Whole Peking Duck +2", img: wholePekingDuck, status: "Canceled", date: "Oct 15, 7:30 PM", fav: false, section: "EARLIER THIS MONTH" },
];

const OrdersPage = () => {
  const [activeFilter, setActiveFilter] = useState("Last 30 Days");

  return (
    <div className="pb-4">
      <AppHeader title="Your Orders" />

      {/* Filters */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">📅 Filter by Date</span>
          <button className="text-sm text-primary font-semibold">Clear All</button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders - responsive grid on desktop */}
      <div className="px-4">
        {["RECENT ACTIVITY", "EARLIER THIS MONTH"].map(section => (
          <div key={section}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mt-5 mb-3 tracking-wider">{section}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.filter(o => o.section === section).map(order => (
                <div key={order.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <img src={order.img} alt={order.name} className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">ORDER #{order.id}</p>
                          <h4 className="font-semibold text-foreground text-sm">{order.name}</h4>
                        </div>
                        <Heart className={`w-5 h-5 ${order.fav ? "text-primary fill-current" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          order.status === "Delivered" ? "bg-muted text-foreground" : "bg-primary/10 text-primary"
                        }`}>{order.status}</span>
                        <span className="text-xs text-muted-foreground">⏰ {order.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <button className="flex items-center gap-1 text-sm text-primary font-medium">
                      📋 View Receipt & Details <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold">
                      <RotateCcw className="w-3.5 h-3.5" /> Reorder
                    </button>
                    <button className="flex items-center gap-1.5 text-foreground px-4 py-2 text-sm font-medium">
                      <Edit className="w-3.5 h-3.5" /> Edit & Repeat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* AI Smart Suggestion */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">AI Smart Suggestion</span>
          <h3 className="font-bold text-foreground mt-2">Craving your usual Friday night meal?</h3>
          <p className="text-sm text-muted-foreground mt-1">Mr Wu remembers you love the General Tso's Combo on Fridays. Want to reorder with one tap?</p>
          <button className="w-full md:w-auto bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-xl mt-3 text-sm">Yes, Reorder My Usual</button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-sm text-muted-foreground">Looking for older orders?</p>
          <p className="text-sm text-muted-foreground">Contact support for records before 2022.</p>
          <button className="mt-2 border border-border rounded-lg px-4 py-2 text-sm font-medium text-foreground">Help & Support</button>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
