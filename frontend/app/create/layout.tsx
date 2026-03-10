import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar isLoggedIn={false} messageCount={3} notifCount={2} />
      <main className="pt-16">{children}</main>
      <Footer />
    </> 
  );
}