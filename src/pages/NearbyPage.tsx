import { useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import "leaflet/dist/leaflet.css";

const locations = [
  { name: "Mr Wu's Downtown", badge: "⚡FASTEST", address: "123 Dragon Way, Center City", dist: "0.8 mi", rating: 4.8, time: "15-20 min", status: "Open", lat: 51.5074, lng: -0.1278 },
  { name: "Wu's Express North", address: "456 Bamboo Lane, Northside", dist: "2.4 mi", rating: 4.5, time: "25-35 min", status: "Open", lat: 51.5300, lng: -0.1200 },
  { name: "Mr Wu's Garden Hills", address: "789 Lotus St, West Side", dist: "3.1 mi", rating: 4.2, time: "30-45 min", status: "Closing Soon", lat: 51.5020, lng: -0.1700 },
];

const NearbyPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [51.515, -0.14],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      locations.forEach(loc => {
        const popup = `
          <div style="font-family:sans-serif;min-width:160px">
            <strong style="display:block;margin-bottom:4px">${loc.name}</strong>
            <span style="font-size:12px;color:#666">${loc.address}</span>
            <div style="margin-top:6px;font-size:12px">
              ⭐ ${loc.rating} &nbsp;|&nbsp; 🕐 ${loc.time}
            </div>
          </div>
        `;
        L.marker([loc.lat, loc.lng])
          .addTo(map)
          .bindPopup(popup);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="pb-4">
      <AppHeader title="Find Mr Wu's" />

      <div className="md:grid md:grid-cols-2 md:gap-4 md:px-4 md:mt-3">
        <div>
          <div
            ref={mapRef}
            className="mx-4 md:mx-0 mt-3 md:mt-0 rounded-xl overflow-hidden"
            style={{ height: "280px" }}
          />
        </div>

        <div>
          <div className="mx-4 md:mx-0 mt-3 md:mt-0 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-card">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <input placeholder="Enter address or zip code" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
            <button className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          <div className="mx-4 md:mx-0 mt-4 bg-secondary/10 border border-secondary/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-foreground">AI Tip: Fastest Choice</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The <strong>Downtown</strong> location has the lowest kitchen volume right now. Save <strong>12 minutes</strong> by ordering here!
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-0 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground">Nearby Locations</h2>
              <button className="text-sm text-primary font-semibold">Filter By Distance →</button>
            </div>
            <div className="space-y-4">
              {locations.map(loc => (
                <div key={loc.name} className="border-b border-border pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm">{loc.name}</h3>
                        {loc.badge && <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">{loc.badge}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{loc.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{loc.dist}</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-foreground">{loc.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className={loc.status === "Closing Soon" ? "text-amber-500 font-medium" : "text-foreground"}>{loc.status}</span>
                    <span>|</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Delivery: {loc.time}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => navigate("/menu")} className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground">Menu</button>
                    <button className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground">Pickup</button>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">Delivery</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearbyPage;
