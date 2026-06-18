import { Outlet } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-transparent text-foreground relative overflow-x-clip">
      {/* Subtle Viewport Ambient glows (green corner glow) */}
      <div 
        className="fixed top-0 right-0 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] pointer-events-none z-[-1]"
        style={{
          background: "radial-gradient(circle at top right, rgba(132, 204, 22, 0.08) 0%, rgba(132, 204, 22, 0.02) 65%, transparent 100%)",
          filter: "blur(70px)"
        }}
      />
      <div 
        className="fixed bottom-0 left-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] pointer-events-none z-[-1]"
        style={{
          background: "radial-gradient(circle at bottom left, rgba(132, 204, 22, 0.03) 0%, transparent 100%)",
          filter: "blur(60px)"
        }}
      />


      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto w-full relative z-10">
          <MobileSidebar />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
