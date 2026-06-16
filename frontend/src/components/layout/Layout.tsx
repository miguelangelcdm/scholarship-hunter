import { Outlet } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto w-full">
          <MobileSidebar />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
