import { describe, expect, it } from "vitest";
import { wikimediaThumbUrl } from "@/lib/og-photo";

describe("wikimediaThumbUrl", () => {
  it("remplace un original Wikimedia par sa vignette", () => {
    expect(
      wikimediaThumbUrl(
        "https://upload.wikimedia.org/wikipedia/commons/c/cd/Luka_Doncic_%2851914951721%29_%28cropped1%29.jpg",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Luka_Doncic_%2851914951721%29_%28cropped1%29.jpg/500px-Luka_Doncic_%2851914951721%29_%28cropped1%29.jpg",
    );
  });

  it("ramène une vignette existante à la largeur standard", () => {
    expect(
      wikimediaThumbUrl("https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Kris_Dunn.jpg/220px-Kris_Dunn.jpg"),
    ).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Kris_Dunn.jpg/500px-Kris_Dunn.jpg");
  });

  it("laisse les autres adresses intactes", () => {
    const nba = "https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png";
    expect(wikimediaThumbUrl(nba)).toBe(nba);
    expect(wikimediaThumbUrl("pas une adresse")).toBe("pas une adresse");
  });
});
