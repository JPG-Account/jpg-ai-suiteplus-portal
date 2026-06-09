import { Topbar } from "../components/Topbar";
import { Hero } from "../components/Hero";
import { OverviewBand } from "../components/OverviewBand";
import { Lanes } from "../components/Lanes";
import { Capabilities } from "../components/Capabilities";
import { Value } from "../components/Value";
import { Tapestry } from "../components/Tapestry";
import { AtAGlance } from "../components/AtAGlance";
import { Charter } from "../components/Charter";
import { OperatingAssets } from "../components/OperatingAssets";
import { Templates } from "../components/Templates";
import { SharedAssets } from "../components/SharedAssets";
import { Playbook } from "../components/Playbook";
import { Backlog } from "../components/Backlog";
import { Guardrails } from "../components/Guardrails";
import { CTAPanel } from "../components/CTAPanel";
import { Footer } from "../components/Footer";
import { getRegistry } from "../lib/registry";

type PageProps = { searchParams: { preview?: string; selected?: string } };

// In preview mode the page is dynamic (no ISR cache) so edits show instantly.
export const dynamic = "force-dynamic";

// Map admin block IDs → portal section keys for the selected-outline overlay
// and the postMessage click handler. The portal renders FIXED sections, so the
// selected highlight is approximate (by section type) when running in preview.
const SECTION_KEY: Record<string, string> = {
  hero: "hero",
  "overview-band": "overview-band",
  lanes: "lanes",
  capabilities: "capabilities",
  value: "value",
  tapestry: "tapestry",
  "at-a-glance": "at-a-glance",
  cta: "cta",
  footer: "footer",
};

export default async function Page({ searchParams }: PageProps) {
  const isPreview = searchParams.preview === "draft";
  const selected = searchParams.selected ?? "";
  const bundle = await getRegistry({ mode: isPreview ? "draft" : "published" });

  return (
    <>
      <Topbar />
      <div data-block-type="hero" data-block-key="hero"><Hero hero={bundle.hero} /></div>
      <div data-block-type="overview-band" data-block-key="overview-band"><OverviewBand /></div>
      <div data-block-type="lanes" data-block-key="lanes"><Lanes lanes={bundle.lanes} /></div>
      <div data-block-type="capabilities" data-block-key="capabilities"><Capabilities solutions={bundle.solutions} /></div>
      <div data-block-type="value" data-block-key="value"><Value /></div>
      <div data-block-type="tapestry" data-block-key="tapestry"><Tapestry /></div>
      <div data-block-type="at-a-glance" data-block-key="at-a-glance"><AtAGlance /></div>
      <div data-block-type="charter" data-block-key="charter"><Charter /></div>
      <div data-block-type="operating-assets" data-block-key="operating-assets"><OperatingAssets /></div>
      <div data-block-type="templates" data-block-key="templates"><Templates /></div>
      <div data-block-type="shared-assets" data-block-key="shared-assets"><SharedAssets /></div>
      <div data-block-type="playbook" data-block-key="playbook"><Playbook /></div>
      <div data-block-type="backlog" data-block-key="backlog"><Backlog /></div>
      <div data-block-type="guardrails" data-block-key="guardrails"><Guardrails /></div>
      <div data-block-type="cta" data-block-key="cta"><CTAPanel /></div>
      <div data-block-type="footer" data-block-key="footer"><Footer /></div>

      {isPreview && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            [data-block-key="${selected}"] { outline: 2px solid #00BCD4; outline-offset: -2px; position: relative; }
            [data-block-key="${selected}"]::before {
              content: "selected"; position: absolute; top: 0; left: 0;
              background: #00BCD4; color: #fff; font: 600 11px system-ui;
              padding: 2px 8px; border-radius: 0 0 4px 0; z-index: 99;
            }
            [data-block-key]:hover:not([data-block-key="${selected}"]) {
              outline: 1px dashed rgba(0, 188, 212, 0.6); outline-offset: -1px;
            }
          ` }} />
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              function notifyReady(){
                try { window.parent && window.parent.postMessage({ type: 'preview-loaded' }, '*'); } catch(e){}
              }
              document.querySelectorAll('[data-block-key]').forEach(function(el){
                el.style.cursor = 'pointer';
                el.addEventListener('click', function(e){
                  e.preventDefault();
                  var key = el.getAttribute('data-block-key');
                  try { window.parent && window.parent.postMessage({ type: 'block-click', key: key }, '*'); } catch(err){}
                }, true);
              });
              if (document.readyState === 'complete') notifyReady();
              else window.addEventListener('load', notifyReady);
            })();
          ` }} />
        </>
      )}
    </>
  );
}
