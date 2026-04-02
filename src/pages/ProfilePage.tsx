import { ChevronRight, MapPin, CreditCard, Heart, AlertTriangle, Bell, Languages, Shield, HelpCircle, FileText, LogOut, Gift, Zap, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const accountItems = [
  { icon: MapPin, label: "Saved Addresses", desc: "Home, Work, and 2 others" },
  { icon: CreditCard, label: "Payment Methods", desc: "Visa ending in 4421" },
  { icon: Heart, label: "Favorites", desc: "12 dishes saved" },
  { icon: AlertTriangle, label: "Allergies & Preferences", desc: "Peanuts, Shellfish, Glu...", badge: "Action Required" },
];

const supportItems = [
  { icon: HelpCircle, label: "Help Center & FAQs" },
  { icon: FileText, label: "Privacy Policy" },
  { icon: LogOut, label: "Sign Out", destructive: true },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const settingsItems = [
    { icon: Bell, label: "Notifications", desc: "Push, Email, SMS" },
    { icon: Languages, label: "Language", desc: "English (US)" },
    { icon: Shield, label: "Privacy & Security", desc: "FaceID, Data sharing" },
  ];

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
        <div className="w-9" />
      </header>

      {/* Desktop two-column */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        {/* Left column */}
        <div>
          {/* Profile Card */}
          <div className="bg-gradient-to-b from-secondary/20 to-background pt-6 pb-4 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-secondary to-primary rounded-full mb-3 relative">
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center text-success-foreground text-xs font-bold">+</div>
            </div>
            <h2 className="text-xl font-bold text-foreground">Alex Johnson</h2>
            <p className="text-sm text-muted-foreground">alex.j@example.com</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="bg-gold text-gold-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">Gold Member</span>
              <span className="text-xs text-muted-foreground">⭐ Top Reviewer</span>
            </div>
          </div>

          {/* Rewards */}
          <div className="mx-4 md:mx-0 -mt-1 bg-foreground rounded-xl p-4 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase opacity-70">Total Rewards</p>
                <p className="text-2xl font-bold">2,450 pts</p>
              </div>
              <Gift className="w-6 h-6 opacity-70" />
            </div>
            <div className="mt-2 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-success rounded-full" />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs opacity-70">
              <span>550 pts until Platinum</span>
              <button className="text-primary-foreground font-semibold">Redeem Points</button>
            </div>
          </div>

          {/* Account & Wallet */}
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account & Wallet</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {accountItems.map((item, i) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < accountItems.length - 1 ? "border-b border-border" : ""}`}>
                  <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {item.badge && <span className="text-[10px] font-medium bg-muted text-foreground px-2 py-0.5 rounded">{item.badge}</span>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Referral Banner */}
          <div className="mx-4 md:mx-0 mt-5 bg-foreground rounded-2xl p-4 flex items-center gap-3 overflow-hidden relative">
            <div className="flex-1">
              <h3 className="font-bold text-primary-foreground text-sm">Spread the flavor!</h3>
              <p className="text-xs text-primary-foreground/70 mt-0.5">Invite friends and you both get <strong className="text-primary-foreground">$10 off</strong> your next order.</p>
              <button className="mt-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg">Invite Friends</button>
            </div>
            <Gift className="w-12 h-12 text-secondary opacity-50" />
          </div>

          {/* App Settings with Dark Mode */}
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">App Settings</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Dark Mode Toggle */}
              <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border">
                {isDark ? <Moon className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <Sun className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Dark Mode</span>
                  <p className="text-xs text-muted-foreground">{isDark ? "On" : "Off"}</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${isDark ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
                  <div className="w-5 h-5 bg-card rounded-full mx-0.5 shadow" />
                </div>
              </button>
              {settingsItems.map((item, i) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < settingsItems.length - 1 ? "border-b border-border" : ""}`}>
                  <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Support</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {supportItems.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.label === "Help Center & FAQs" ? () => navigate("/help") : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < supportItems.length - 1 ? "border-b border-border" : ""}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${item.destructive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium flex-1 ${item.destructive ? "text-primary" : "text-foreground"}`}>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6 pb-2">MR WU'S DELIVERY APP<br />Version 2.4.12 (Build 402)</p>
    </div>
  );
};

export default ProfilePage;
