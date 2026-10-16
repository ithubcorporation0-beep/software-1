import * as React from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Layers,
  Package,
  ShoppingCart,
  Users,
  Briefcase,
  BarChart3,
  FileText,
  Cpu,
  LineChart,
  KeyRound,
  Share2,
  TrendingUp,
  RefreshCw,
  Lock,
  Building,
  HeartHandshake,
  Globe,
  Mail,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";

export function ErpHeroShowcase() {
  const features = [
    { title: "All-in-one ERP, Accounting, CRM & POS", icon: Layers },
    { title: "Inventory & Warehouse Management", icon: Package },
    { title: "Sales & Purchase Management", icon: ShoppingCart },
    { title: "HR & Payroll Management", icon: Users },
    { title: "Project & Task Management", icon: Briefcase },
    { title: "Financial Accounting & Reporting", icon: BarChart3 },
    { title: "FBR Digital Invoicing & POS Integration", icon: FileText },
    { title: "Smarter Workflows, Better Decisions", icon: Cpu },
    { title: "Real-time Reports & Analytics", icon: LineChart },
    { title: "Secure, Role-based Access", icon: KeyRound },
  ];

  const valuePillars = [
    { title: "Unified Business Operations", icon: Share2 },
    { title: "Real-time Insights & Analytics", icon: TrendingUp },
    { title: "Automated Workflows & Processes", icon: RefreshCw },
    { title: "Data Security & Role-based Access", icon: Lock },
    { title: "Scalable for Every Business Size", icon: Building },
  ];

  return (
    <div className="flex flex-col justify-between h-full min-h-screen bg-white text-slate-900 p-6 sm:p-8 lg:p-10 border-r border-slate-200/80 overflow-y-auto">
      {/* 1. Header Bar: Logo + Trust Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c3924] to-[#125838] text-white shadow-md">
            <svg
              className="h-7 w-7 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-[#0c3924]">
                ITHUB ERP
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              AN ULTIMATE SOLUTION FOR YOUR ENTIRE BUSINESS MANAGEMENT
            </p>
          </div>
        </div>

        {/* Security & Scale Pill */}
        <div className="flex items-center gap-2.5 rounded-xl bg-[#0c3924] text-white px-4 py-2 border border-emerald-600/30 shadow-sm self-start sm:self-auto">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wide text-white">
              Secure <span className="text-emerald-400">|</span> Reliable <span className="text-emerald-400">|</span> Scalable
            </div>
            <div className="text-[10px] text-emerald-300 font-medium">
              Built for Your Business Growth
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hero Headline & Description */}
      <div className="pt-2 pb-4 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0c3924] leading-tight">
          An Ultimate Solution for Your Entire Business Management!
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Manage everything. Better. Together. Accounting, inventory, sales, HR, projects, and
          compliance &mdash; unified for modern businesses.
        </p>
      </div>

      {/* 3. Main Showcase: Vertical Feature Badges + Photorealistic Mockup Scene */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-2">
        {/* Left Side: 10 Bullet Feature Badges */}
        <div className="md:col-span-5 space-y-2">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 group transition-transform duration-200 hover:translate-x-1"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0c3924] text-emerald-400 shadow-xs">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {feat.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Side: Mockup Image */}
        <div className="md:col-span-7">
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-xl bg-slate-900 group">
            <Image
              src="/images/erp_showcase_banner.jpg"
              alt="ITHUB ERP Workspace on Laptop & Mobile"
              width={1200}
              height={800}
              priority
              className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-102"
            />
            {/* Subtle gloss overlay badge */}
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-white/20 text-white rounded-lg px-2.5 py-1 text-[10px] font-medium flex items-center gap-1.5 shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Workspace Engine
            </div>
          </div>
        </div>
      </div>

      {/* 4. Deep Forest Green Value Pillars Strip */}
      <div className="my-4 rounded-xl bg-[#0c3924] text-white p-3.5 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center divide-y sm:divide-y-0 sm:divide-x divide-emerald-800/60">
          {valuePillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div key={i} className="flex flex-col items-center justify-center pt-2 sm:pt-0 px-2 first:pt-0">
                <Icon className="h-5 w-5 text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-white leading-tight">
                  {pillar.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Company Info & Contact Footer */}
      <div className="pt-3 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Handshake & Company */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0c3924] border border-emerald-200">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs leading-snug">
              From all of us at ITHUB ERP
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Thank you for your trust and partnership.
            </div>
          </div>
        </div>

        {/* Web & Email */}
        <div className="space-y-1 sm:border-x sm:border-slate-200 sm:px-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <Globe className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <a href="https://www.ithub-enterprise.com" target="_blank" rel="noreferrer" className="hover:underline">
              www.ithub-enterprise.com
            </a>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <Mail className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <a href="mailto:contact@ithub-enterprise.com" className="hover:underline">
              contact@ithub-enterprise.com
            </a>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="flex items-start gap-2 text-[11px] font-medium text-slate-700">
          <PhoneCall className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 font-mono text-[10.5px]">
            <div>+44 780 9211082</div>
            <div>+92 333 1333443</div>
            <div>+92 333 0132336</div>
          </div>
        </div>
      </div>
    </div>
  );
}
