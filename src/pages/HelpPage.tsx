import { useState } from "react";
import { Search, ChevronDown, ChevronRight, MessageSquare, Mail, Truck, CreditCard, ClipboardList, User, Bell } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";

const categories = [
  { icon: Truck, label: "Delivery" },
  { icon: CreditCard, label: "Payments" },
  { icon: ClipboardList, label: "Orders" },
  { icon: User, label: "Account" },
];

const faqs = [
  { q: "My order is taking longer than usual", a: "We apologize for the delay! Traffic or high kitchen volume might be affecting your delivery. Check the 'Order Tracking' screen for real-time updates or use Live Chat for a status check." },
  { q: "How do I request a refund?", a: "Go to Orders → select the order → View Receipt & Details → Request Refund." },
  { q: "Can I edit my order after placing it?", a: "You can modify your order within 2 minutes of placing it. After that, contact support." },
];

const notifications = [
  { icon: Truck, title: "Order #8829 Arriving Soon", desc: "Your Kung Pao Chicken is just 5 minutes away! Get ready for a delicious meal.", time: "2m ago", isNew: true },
  { icon: CreditCard, title: "Weekend Special: 20% OFF", desc: "Use code WU20 for 20% off all Dim Sum combos this weekend. Valid until Sunday midnight.", time: "1h ago", isNew: true },
  { icon: CreditCard, title: "Refund Processed Successfully", desc: "The refund of $12.50 for Order #8712 has been sent to your original payment method.", time: "Yesterday", isNew: false },
  { icon: Bell, title: "Account Security Update", desc: "We've enhanced our login security. Your account is now more protected than ever.", time: "2d ago", isNew: false },
];

const HelpPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="pb-4">
      <AppHeader title="Help & Support" showBack />

      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-card">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search help topics..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>
      </div>

      {/* Support buttons - side by side on desktop */}
      <div className="mx-4 mt-4 md:grid md:grid-cols-2 md:gap-3">
        <button className="w-full bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 mb-2 md:mb-0">
          <MessageSquare className="w-6 h-6" />
          <div className="text-left">
            <h3 className="font-bold text-sm">Live Chat Support</h3>
            <p className="text-xs opacity-80">Speak with our AI & humans instantly</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto" />
        </button>
        <button className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Mail className="w-6 h-6 text-muted-foreground" />
          <div className="text-left">
            <h3 className="font-bold text-sm text-foreground">Email Support</h3>
            <p className="text-xs text-muted-foreground">Response within 24 hours</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Desktop two-column for categories + FAQs / notifications */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          {/* Categories */}
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
            <div className="grid grid-cols-4 gap-3">
              {categories.map(cat => (
                <button key={cat.label} className="flex flex-col items-center gap-1.5 p-3 bg-card border border-border rounded-xl">
                  <cat.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Common Issues */}
          <div className="px-4 md:px-0 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Common Issues</h3>
              <button className="text-sm text-primary font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <span className="text-sm font-medium text-foreground">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Notification Center */}
          <div className="px-4 md:px-0 mt-6 md:mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification Center</h3>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">2 Unread</span>
            </div>
            <div className="space-y-3">
              {notifications.map((notif, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-border">
                  <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <notif.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{notif.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.desc}</p>
                    {notif.isNew && <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">New</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full text-center text-sm text-muted-foreground mt-3 py-2">Load Older Notifications</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-muted-foreground">Support ID: WU-HELP-99X2-771</p>
        <p className="text-xs text-muted-foreground">Mr Wu's Customer Service © 2024</p>
      </div>
    </div>
  );
};

export default HelpPage;
