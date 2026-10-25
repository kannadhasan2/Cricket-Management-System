export default function Footer(){
    return (
        <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 IPL League Manager. Demo data for illustration only.</p>
          <div className="flex flex-wrap gap-5 font-medium">
            {["About", "Rules", "Support", "Privacy"].map((l) => (
              <a key={l} href="#" className="hover:text-[#FF4E00]">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    )
}
