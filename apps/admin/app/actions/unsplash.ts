"use server";

const THEME_KEYWORDS: Record<string, string> = {
  'Perdão': 'sunrise,landscape',
  'Liderança': 'mountain,peak,landscape',
  'Gratidão': 'sunlight,field,nature',
  'Família': 'forest,path,landscape',
  'Sabedoria': 'stars,night,landscape',
  'Identidade': 'water,reflection,landscape',
  'Cura': 'river,peaceful,landscape',
  'Geral': 'epic,landscape,nature'
};

export async function getRandomThemeImage(themeId: string) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  const keyword = THEME_KEYWORDS[themeId] || 'faith';
  
  if (!apiKey) {
    // Fallback: Picsum (consistent images based on seed)
    const randomSeed = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/seed/${keyword}-${randomSeed}/1200/400`;
  }

  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape`, {
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      },
      // Ensure we don't cache this so we always get a new random image
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error("Failed to fetch from Unsplash API");
    }

    const data = await res.json();
    // Return a banner-cropped high-quality image
    return `${data.urls.raw}&auto=format&fit=crop&w=1200&h=400&q=80`;
  } catch (err) {
    console.error("Unsplash API Error:", err);
    // Fallback on error
    const randomSeed = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/seed/${keyword}-${randomSeed}/1200/400`;
  }
}

export async function searchUnsplashImages(query: string, page: number = 1) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    const cleanQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "") || 'faith';
    // Generate 12 fake images for the query as fallback
    return Array.from({ length: 12 }).map((_, i) => ({
      id: `fallback-${i}`,
      url: `https://picsum.photos/seed/${cleanQuery}-${i + page * 20}/1200/400`,
      thumb: `https://picsum.photos/seed/${cleanQuery}-${i + page * 20}/600/200`,
      author: "Picsum",
      authorLink: "#"
    }));
  }

  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&orientation=landscape`, {
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to search Unsplash API");
    }

    const data = await res.json();
    return data.results.map((img: any) => ({
      id: img.id,
      url: `${img.urls.raw}&auto=format&fit=crop&w=1200&h=400&q=80`,
      thumb: `${img.urls.raw}&auto=format&fit=crop&w=600&h=200&q=80`,
      author: img.user.name,
      authorLink: img.user.links.html
    }));
  } catch (err) {
    console.error("Unsplash Search Error:", err);
    return [];
  }
}
