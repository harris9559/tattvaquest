import HomeHeroSection from "./_components/home/HomeHeroSection";
import HomeTrustedBySection from "./_components/home/HomeTrustedBySection";
import HomeServicesSection from "./_components/home/HomeServicesSection";
import HomeWhyUsSection from "./_components/home/HomeWhyUsSection";
import HomeProcessSection from "./_components/home/HomeProcessSection";
import HomeInsightsSection from "./_components/home/HomeInsightsSection";
import HomeCapabilitiesSection from "./_components/home/HomeCapabilitiesSection";

export default function Home() {
  return (
    <div>
      <HomeHeroSection />
      <HomeTrustedBySection />
      <HomeServicesSection />
      <HomeWhyUsSection />
      <HomeProcessSection />
      <HomeInsightsSection />
      <HomeCapabilitiesSection />
    </div>
  );
}
