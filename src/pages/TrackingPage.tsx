import { ChevronLeft, Phone, MessageSquare, Share2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  { label: "Order Received", time: "6:15 PM", done: true },
  { label: "Preparing your meal", time: "6:22 PM", done: true },
  { label: "Out for delivery", time: "6:35 PM", done: true, active: true },
  { label: "Arriving soon", time: "Est. 6:47 PM", done: false },
];

const TrackingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-20 min-h-screen bg-muted">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Tracking Order #1042-W</h1>
        <div className="w-6" />
      </header>

      {/* Map Area */}
      <div className="h-64 bg-muted flex flex-col items-center justify-center relative">
        <div className="bg-success text-success-foreground px-4 py-1 rounded-full text-xs font-semibold uppercase">Estimated Arrival</div>
        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-3xl font-bold text-foreground">12 mins</span>
        </div>
        <p className="text-xs text-muted-foreground mt-4">🗺️ Live map tracking</p>
      </div>

      {/* Driver Card */}
      <div className="mx-4 -mt-6 bg-card rounded-2xl shadow-lg p-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg">👨</div>
            <div>
              <h3 className="font-bold text-foreground">David</h3>
              <p className="text-xs text-muted-foreground">⭐ 4.9 • Honda Super Cub</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4 text-foreground" />
            </button>
            <button className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Order Progress */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-foreground text-sm">Order Progress</h4>
          <span className="text-xs text-muted-foreground italic">AI updated 30s ago</span>
        </div>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-2 ${step.done ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                {i < steps.length - 1 && <div className={`w-0.5 h-6 ${step.done ? "bg-primary" : "bg-border"}`} />}
              </div>
              <div className="-mt-0.5">
                <p className={`text-sm font-semibold ${step.active ? "text-primary" : step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground">
            <Share2 className="w-4 h-4" /> Share ETA
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground">
            <Phone className="w-4 h-4" /> Call Shop
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
