import AboutSection from "../components/home/AboutSection";
import HeroSection from "../components/home/HeroSection";
import UpcomingEvents from "../components/home/UpcomingEvents";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <AboutSection />
      <UpcomingEvents />
    </div>
  );
}
