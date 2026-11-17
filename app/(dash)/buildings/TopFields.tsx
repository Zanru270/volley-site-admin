"use client";

import { Toggle } from "@/components/ui";
import ColourPicker from "@/components/ColourPicker";
import { BANNER_COLOUR, BANNER_TEXT_COLOUR, buildingName, HERO_COLOUR, HERO_TITLE_COLOUR, NAV_COLOUR, TOP_COLOUR_SWATCHES } from "@/lib/site";
import type { Banner, BuildingBanner, Location } from "@/lib/types";
import { BannerFields, BannerSample } from "../home/fields";

/* The top of a building's page: its announcement banner, and the colours
   of the slideshow section under it. Shared by the live editor's cards
   (BuildingLiveEditor.tsx) and its form view (LocationForm.tsx); each takes
   the draft and reports the change, nothing here saves. The pickers are
   the card's name colour one (ColourPicker). */

// The building's banner, or one that follows the home page's while it has none.
const bannerOf = (loc: Location, home: Banner): BuildingBanner =>
  loc.banner ?? { own: false, enabled: home.enabled, text: "", linkText: "", linkHref: "", after: "", colour: "" };

/* Its banner: a colour of its own (empty is the home page banner's), and
   either the home page's wording, link and on/off, or its own. Switched to
   its own for the first time, it starts from the home page's wording. */
export function BuildingBannerFields({
  location,
  home,
  onChange,
}: {
  location: Location;
  // The home page's banner, as saved.
  home: Banner;
  onChange: (banner: BuildingBanner) => void;
}) {
  const banner = bannerOf(location, home);
  const set = (patch: Partial<BuildingBanner>) => onChange({ ...banner, ...patch });
  const homeColour = home.colour || BANNER_COLOUR;
  const homeText = home.textColour || BANNER_TEXT_COLOUR;
  // What this page's banner says: its own wording, or the home page's.
  const shown = banner.own ? banner : { ...home, colour: banner.colour, textColour: banner.textColour };
  const fresh = !banner.text && !banner.linkText && !banner.linkHref && !banner.after;
  return (
    <div className="space-y-5">
      <BannerSample banner={shown} fallback={{ colour: homeColour, textColour: homeText }} />
      <ColourPicker
        label="Colour"
        hint="Its background on this building's page. Empty uses the home page banner's colour."
        value={banner.colour ?? ""}
        fallback={homeColour}
        onChange={(colour) => set({ colour })}
        swatches={TOP_COLOUR_SWATCHES}
        resetLabel="Reset to the home page’s"
      />
      <div className="border-t border-ink/10 pt-5">
        <ColourPicker
          label="Text colour"
          hint="Its wording and link on this building's page. Empty uses the home page banner's text colour."
          value={banner.textColour ?? ""}
          fallback={homeText}
          onChange={(textColour) => set({ textColour })}
          swatches={TOP_COLOUR_SWATCHES}
          resetLabel="Reset to the home page’s"
        />
      </div>
      <div className="border-t border-ink/10 pt-5">
        <Toggle
          checked={!banner.own}
          onChange={(same) =>
            set(
              same
                ? { own: false }
                : fresh
                  ? {
                      own: true,
                      enabled: home.enabled,
                      text: home.text,
                      linkText: home.linkText,
                      linkHref: home.linkHref,
                      after: home.after,
                    }
                  : { own: true },
            )
          }
          label="Same wording as the home page"
          description={
            banner.own
              ? "Off: this building's page has its own wording and link, below."
              : "Its wording, link, and whether it shows follow the home page's banner. Turn off to give this page its own."
          }
        />
      </div>
      {banner.own && (
        <div className="border-t border-ink/10 pt-5">
          <BannerFields
            banner={banner}
            onChange={set}
            colour={false}
            showHint="Off hides it on this building's page only."
          />
        </div>
      )}
    </div>
  );
}

/* The slideshow section's background (it also washes the side photos), its
   title's colour ("Volley <name>" and the city), and the menu bar's over
   it (the logo, its line and the menu button, while the menu's closed).
   Empty keeps the website's pink, red and ink. */
export function TopColourFields({
  location,
  onChange,
}: {
  location: Location;
  onChange: (patch: Pick<Location, "hero_colour" | "hero_title_colour" | "nav_colour">) => void;
}) {
  const background = location.hero_colour || HERO_COLOUR;
  const title = location.hero_title_colour || HERO_TITLE_COLOUR;
  const bar = location.nav_colour || NAV_COLOUR;
  return (
    <div className="space-y-5">
      {/* The three together, roughly as the page has them: the bar (its
          mark, its line and the menu button) over the title. The mark is
          the admin's own copy of the website's: a mask has to come from
          this address. */}
      <div
        className="overflow-hidden rounded-xl border border-ink/10 px-4 pt-3 pb-4 text-center leading-none"
        style={{ backgroundColor: background }}
      >
        <div className="flex items-center justify-between border-b pb-2" style={{ color: bar, borderColor: bar }}>
          <span
            aria-hidden="true"
            className="block size-5 bg-current"
            style={{
              WebkitMaskImage: "url(/Volley-Logo-Small-Black.svg)",
              maskImage: "url(/Volley-Logo-Small-Black.svg)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
          <span aria-hidden="true" className="flex w-4 flex-col gap-1">
            <span className="h-px bg-current" />
            <span className="h-px bg-current" />
          </span>
        </div>
        <div className="mt-4 flex flex-col items-center" style={{ color: title }}>
          <span className="font-sans text-lg font-light uppercase">{buildingName(location)}</span>
          {location.city && <span className="mt-1 font-serif text-lg italic">{location.city}</span>}
        </div>
      </div>
      <ColourPicker
        label="Background"
        hint="Behind the slideshow at the top, up to the banner. The photos either side are washed in it too."
        value={location.hero_colour ?? ""}
        fallback={HERO_COLOUR}
        onChange={(hero_colour) => onChange({ hero_colour: hero_colour || null })}
        swatches={TOP_COLOUR_SWATCHES}
      />
      <div className="border-t border-ink/10 pt-5">
        <ColourPicker
          label="Title"
          hint={'"Volley …" and the city over the slideshow.'}
          value={location.hero_title_colour ?? ""}
          fallback={HERO_TITLE_COLOUR}
          onChange={(hero_title_colour) => onChange({ hero_title_colour: hero_title_colour || null })}
          swatches={TOP_COLOUR_SWATCHES}
        />
      </div>
      <div className="border-t border-ink/10 pt-5">
        <ColourPicker
          label="Menu bar"
          hint="The Volley logo, the line under it, the building's name beside it and the menu button. Once the menu's opened, it keeps its own colours."
          value={location.nav_colour ?? ""}
          fallback={NAV_COLOUR}
          onChange={(nav_colour) => onChange({ nav_colour: nav_colour || null })}
          swatches={TOP_COLOUR_SWATCHES}
        />
      </div>
    </div>
  );
}
