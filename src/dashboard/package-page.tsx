// A package's own pages (D-511): at #/pkg/<package>/<name>, the page's head with its title and icon, its whole inside drawn by the package's page code; and the
// links to them in the package's row of Packages, by their titles.
import { useContext, useEffect, useRef } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import type { ShownModule } from "./data.ts";
import { Drawn, WidgetsContext } from "./extension-widgets.tsx";
import { Icon } from "./icons.tsx";
import { codeOfModule, ExtensionRoot, ModulesContext, ownPageIn, pagePropsOf, usePageModule, useWidgetData } from "./page-code.tsx";

// Whether the player moved in the page since it loaded: a package's page opened then takes the focus to its title.
let moved = false;

if (typeof window !== "undefined") {
    window.addEventListener("hashchange", () => {
        moved = true;
    }, { once: true });
}

/**
 * A package's page by its package and name, once its module came; the focus on its title as it opens. Nothing while its module comes or has no such page;
 * a module that did not load says so in the page, with its error and whose it is.
 */
export function PackagePage({ name, page }: { name: string | undefined; page: string | undefined; })
{
    const module = useContext(ModulesContext).find((one) => one.package === name);
    const owner = module === undefined ? undefined : codeOfModule(module);
    const loaded = usePageModule(owner);
    const title = useRef<HTMLHeadingElement>(null);
    const found = page === undefined ? undefined : ownPageIn(loaded, page);
    const own = found instanceof Error ? undefined : found;
    const data = useWidgetData(module?.package ?? "", own?.widget, undefined, useContext(WidgetsContext));

    // Opened from the page, as by a tab or a menu, the focus goes to its title; loaded by its address, the focus stays at the page's start, as any page's,
    // and its title has no ring.
    useEffect(() => {
        if (moved) {
            title.current?.focus({ preventScroll: true });
        }
    }, [own === undefined, name, page]);

    if (owner === undefined || page === undefined || found === undefined) {
        return null;
    }

    const Drawing = own?.draw;
    return (
        <section class="page-stack package-page" aria-labelledby="package-page-title">
            <div class="page-head">
                <span class="page-mark">{own?.icon === undefined ? <Icon name="packages" /> : <Drawn path={own.icon} kind="icon" />}</span>
                <h2 id="package-page-title" ref={title} tabIndex={-1} dir="auto">{own?.title ?? page}</h2>
            </div>
            <ExtensionRoot widget={owner} loaded={loaded} kind="ext-page" draw={() => (Drawing === undefined ? null : <Drawing {...pagePropsOf(owner)} name={page} {...(data === undefined ? {} : { data })} />)} />
        </section>
    );
}

/** The links to a package's own pages, by their titles, after the meta of its row in Packages; nothing for a package without any. */
export function OwnPageLinks({ name }: { name: string | undefined; })
{
    const module = useContext(ModulesContext).find((one) => one.package === name);
    return module === undefined ? null : <ModulePageLinks module={module} />;
}

function ModulePageLinks({ module }: { module: ShownModule; })
{
    const loaded = usePageModule(codeOfModule(module));
    const pages = loaded === undefined || loaded instanceof Error ? [] : Object.entries(loaded.pages ?? {});
    return (
        <>
            {pages.map(([page, own]) => (
                <span key={page}>
                    <span class="package-report-gap">{" · "}</span>
                    <a class="package-report" href={sectionAddress("pkg", module.package, page)} dir="auto">{own.title}</a>
                </span>
            ))}
        </>
    );
}
