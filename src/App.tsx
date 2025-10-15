import { useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import RecordPitch from "./components/RecordPitch";

function SectionTitle({
  kicker,
  title,
  desc,
}: {
  kicker?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      {kicker && (
        <p className="mb-2 text-xs uppercase tracking-wide text-[--text-muted]">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{title}</h2>
      {desc && <p className="mt-3 text-[--text-muted]">{desc}</p>}
    </div>
  );
}

export default function App() {
  // ✅ Animation d'apparition progressive
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document
      .querySelectorAll<HTMLElement>(".reveal")
      .forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[--surface] text-[--text]">
      {/* Header */}
      <header className="container-px">
        <div className="max-w-content flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[--accent]"></div>
            <span className="font-semibold">yesin.media</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-px">
        <div className="max-w-content grid gap-8 lg:grid-cols-2 lg:gap-12 py-10 md:py-16">
          <div className="reveal">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Votre voix est votre meilleure publicité.
            </h1>
            <p className="mt-4 text-[--text-muted]">
              Enregistrez un pitch vocal de 90 secondes. Partagez l’histoire, la
              passion et les valeurs de votre projet — gratuitement.
            </p>

            <div className="mt-6">
              <RecordPitch />
            </div>

            <div className="mt-4">
              <a
                href="#cta"
                className="btn inline-flex items-center gap-2 rounded-xl bg-[--accent] px-5 py-3 text-white font-medium hover:bg-[--accent-600] transition"
              >
                Je partage mon histoire en 90s
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {/* Colonne droite avec l'image */}
          <div className="reveal">
            <div className="rounded-3xl border border-[--border] bg-[--card] p-6">
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="/images/yesin-app-mockup.png"
                  alt="Aperçu de l’application yesin.media"
                  className="w-full h-auto object-cover aspect-[4/3] md:aspect-video"
                  loading="eager"
                />
              </div>
              <p className="mt-3 text-sm text-[--text-muted]">
                Aperçu de l’application : vos annonces sonores, diffusées
                localement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container-px">
        <div className="max-w-content py-12 md:py-16 reveal">
          <SectionTitle
            kicker="Comment ça marche"
            title="Simple comme 1, 2, 3."
            desc="Créez votre profil, enregistrez votre pitch, soyez audible localement."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              [
                "Créez votre profil",
                "Renseignez quelques informations clés (2 minutes).",
              ],
              [
                "Enregistrez votre pitch",
                "90 secondes au téléphone. Authenticité > perfection.",
              ],
              [
                "Devenez audible",
                "Votre histoire disponible pour des milliers d’auditeurs locaux.",
              ],
            ].map(([t, d], i) => (
              <div
                key={i}
                className="rounded-2xl border border-[--border] bg-[--card] p-6 reveal"
              >
                <div className="mb-3 inline-flex h-9 w-9 select-none items-center justify-center rounded-lg bg-[--surface-3] text-sm">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-[--text-muted]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audio samples */}
      <section className="container-px">
        <div className="max-w-content py-12 md:py-16 reveal">
          <SectionTitle
            title="La radio locale, ça sonne comme ça."
            desc="Plongez dans l’ambiance avec quelques exemples (maquette)."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-[--border] bg-[--card] p-5 reveal"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[--surface-3]"></div>
                  <div className="flex-1">
                    <div className="font-medium">Exemple #{n}</div>
                    <div className="text-xs text-[--text-muted]">
                      Quartier Saint-Pierre
                    </div>
                  </div>
                  <button className="btn rounded-full border border-[--border] bg-[--surface-2] px-3 py-1.5 text-sm hover:bg-[--surface-3]">
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="container-px">
        <div className="max-w-content py-12 md:py-16 reveal">
          <SectionTitle title="Pourquoi enregistrer un pitch audio ?" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [
                "Créez un lien humain",
                "Votre voix transmet l’émotion et crée une confiance immédiate.",
              ],
              [
                "Cible 100% locale",
                "Soyez découvert par les habitants qui vous entourent.",
              ],
              [
                "Visibilité gratuite",
                "Zéro budget, zéro risque : un canal puissant pour tous.",
              ],
              [
                "Gagnez du temps",
                "90 secondes d’enregistrement pour une diffusion 24/7.",
              ],
            ].map(([t, d], i) => (
              <div
                key={i}
                className="rounded-2xl border border-[--border] bg-[--card] p-6 reveal"
              >
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-[--text-muted]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section id="cta" className="container-px">
        <div className="max-w-content py-14 md:py-20 reveal">
          <div className="rounded-3xl border border-[--border] bg-gradient-to-br from-[--accent] to-[--accent-700] p-1">
            <div className="rounded-3xl bg-[--surface] p-8 text-center">
              <h3 className="text-2xl md:text-3xl font-bold">
                Prêt à faire entendre votre histoire ?
              </h3>
              <p className="mt-2 text-[--text-muted]">
                Enregistrez votre pitch maintenant. C’est simple, rapide et
                gratuit.
              </p>
              <div className="mt-6 flex justify-center">
                <a
                  href="#"
                  className="btn inline-flex items-center gap-2 rounded-xl bg-[--accent] px-5 py-3 text-white font-medium hover:bg-[--accent-600] transition"
                >
                  Je partage mon histoire en 90s
                  <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container-px">
        <div className="max-w-content border-t border-[--border] py-8 text-sm text-[--text-muted]">
          © {new Date().getFullYear()} yesin.media — Pour un web plus humain,
          fait à Lille.
        </div>
      </footer>
    </div>
  );
}
