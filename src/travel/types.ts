export type Transport = "flight" | "car" | "bike" | "taxi" | "train" | "bicycle" | "bus" | "walking" | "ship";

export type Location = {
  id: string;
  name: string;
  country: string;
  code: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  videoDuration?: number;
  description?: string;
};

export function getLocationVideo(place?: Location | null): { url: string; duration?: number; credit?: string } | null {
  if (!place) return null;

  // Video metadata is read by the player so clips are never shortened or sped up.
  if (place.videoUrl) return { url: place.videoUrl, duration: place.videoDuration };

  // JSON itineraries can supply their own arrival gallery.  Do not replace it
  // with a built-in city video merely because a stop happens to be named Mumbai/Goa.
  if (place.images && place.images.length > 0) return null;

  const videoId = place.id.toLowerCase();
  const videoName = place.name.toLowerCase();
  if (videoId.includes("mumbai") || videoName.includes("mumbai")) {
    return { url: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4", credit: "Mumbai video sample · public MP4" };
  }
  if (videoId.includes("goa") || videoName.includes("goa")) {
    return { url: "/videos/goa.webm", credit: "Goa beach hyperlapse · Subhashish Panigrahi · CC BY-SA 3.0" };
  }

  // =========================================================================
  // PUBLIC VIDEO CODE (COMMENTED OUT)
  // To enable videos from the /public/videos folder or custom videoUrl:
  // 1. Add your video files (e.g., .mp4, .webm) into `public/videos/`
  // 2. Uncomment the block below so that destinations match and play video
  // =========================================================================
  /*
  if (place.videoUrl) return { url: place.videoUrl, duration: place.videoDuration ?? 6 };

  const id = place.id.toLowerCase();
  if (id.includes("goa")) {
    return {
      url: "/videos/goa.webm",
      duration: 6,
      credit: "Goa beach hyperlapse · Subhashish Panigrahi · CC BY-SA 3.0",
    };
  }
  if (id.includes("manali")) {
    return {
      url: "/videos/manali.webm",
      duration: 6,
      credit: "Cycling on the Manali–Leh Highway · Yann Forget · CC BY 3.0",
    };
  }
  if (id.includes("london")) {
    return {
      url: "/videos/london.webm",
      duration: 6,
      credit: "Trafalgar Square Bubbles · Dmitry Dzhus · CC BY 2.0",
    };
  }
  */

  return null;
}

export function getLocationImages(place?: Location | null): string[] {
  if (!place) return [];
  if (place.images && place.images.length > 0) return place.images;
  if (!place.imageUrl) return [];

  // Optional traveller-focused gallery. Normal journeys use photos for the selected destination below.
  const tripMoments = [
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1600&auto=format&fit=crop&q=88",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=88",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&auto=format&fit=crop&q=88",
  ];
  if (place.description?.includes("[traveller]")) return tripMoments;

  const id = place.id.toLowerCase();
  const name = place.name.toLowerCase();

  if (id.includes("delhi") || name.includes("delhi")) {
    return [
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&auto=format&fit=crop&q=80", // India Gate
      "https://images.unsplash.com/photo-1592635196078-9fdc757f27f4?w=900&auto=format&fit=crop&q=80", // Humayun's Tomb
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=900&auto=format&fit=crop&q=80", // Red Fort
    ];
  }
  if (id.includes("goa") || name.includes("goa")) {
    return [
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80", // Palolem Beach
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80", // Sunset Coast
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=900&auto=format&fit=crop&q=80", // Palms & Shore
    ];
  }
  if (id.includes("shimla") || name.includes("shimla")) {
    return [
      "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=900&auto=format&fit=crop&q=80", // The Ridge
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&auto=format&fit=crop&q=80", // Snowy Mountain Valley
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=900&auto=format&fit=crop&q=80", // Pine Forest View
    ];
  }
  if (id.includes("mumbai") || name.includes("mumbai")) {
    return [
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=900&auto=format&fit=crop&q=80", // Gateway of India
      "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=900&auto=format&fit=crop&q=80", // Marine Drive
      "https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=900&auto=format&fit=crop&q=80", // Sea Link
    ];
  }
  if (id.includes("jaipur") || name.includes("jaipur")) {
    return [
      "https://images.unsplash.com/photo-1603262110263-fb010d6e75dc?w=900&auto=format&fit=crop&q=80", // Hawa Mahal
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=900&auto=format&fit=crop&q=80", // Amber Fort
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&auto=format&fit=crop&q=80", // City Palace
    ];
  }
  if (id.includes("manali") || name.includes("manali")) {
    return [
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&auto=format&fit=crop&q=80", // Snow Peaks
      "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?w=900&auto=format&fit=crop&q=80", // Pine Valley
      "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=900&auto=format&fit=crop&q=80", // Solang Valley
    ];
  }
  if (id.includes("paris") || name.includes("paris")) {
    return [
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&auto=format&fit=crop&q=80", // Eiffel Tower
      "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=900&auto=format&fit=crop&q=80", // Louvre Pyramid
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=900&auto=format&fit=crop&q=80", // Notre Dame & Seine
    ];
  }
  if (id.includes("tokyo") || name.includes("tokyo")) {
    return [
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=900&auto=format&fit=crop&q=80", // Tokyo Tower
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&auto=format&fit=crop&q=80", // Shibuya Crossing
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&auto=format&fit=crop&q=80", // Mt Fuji & Sakura
    ];
  }
  if (id.includes("dubai") || name.includes("dubai")) {
    return [
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&auto=format&fit=crop&q=80", // Burj Khalifa
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=900&auto=format&fit=crop&q=80", // Marina Skyline
      "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=900&auto=format&fit=crop&q=80", // Desert Safari
    ];
  }
  if (id.includes("london") || name.includes("london")) {
    return [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&auto=format&fit=crop&q=80", // Big Ben
      "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=900&auto=format&fit=crop&q=80", // Tower Bridge
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=900&auto=format&fit=crop&q=80", // London Eye
    ];
  }
  if (id.includes("new-york") || name.includes("new york")) {
    return [
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=900&auto=format&fit=crop&q=80", // Skyline
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=900&auto=format&fit=crop&q=80", // Central Park
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=900&auto=format&fit=crop&q=80", // Times Square
    ];
  }

  // High quality Unsplash landmark photo variations
  const base = place.imageUrl.split("?")[0];
  return [
    place.imageUrl,
    `${base}?w=900&auto=format&fit=crop&q=80&sig=2`,
    `${base}?w=900&auto=format&fit=crop&q=80&sig=3`,
  ];
}

export const destinations: Location[] = [
  // India & South Asia
  {
    id: "delhi",
    name: "Delhi Airport",
    country: "India",
    code: "DEL",
    lat: 28.56,
    lng: 77.1,
    imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&auto=format&fit=crop&q=80",
    description: "Indira Gandhi International Airport & Capital",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    code: "BOM",
    lat: 19.08,
    lng: 72.88,
    imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80",
    description: "Gateway of India & Marine Drive",
  },
  {
    id: "goa",
    name: "Goa Beach",
    country: "India",
    code: "GOI",
    lat: 15.38,
    lng: 73.83,
    imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format&fit=crop&q=80",
    description: "Tropical beaches & coastal sunsets",
  },
  {
    id: "jaipur",
    name: "Jaipur Pink City",
    country: "India",
    code: "JAI",
    lat: 26.91,
    lng: 75.79,
    imageUrl: "https://images.unsplash.com/photo-1603262110263-fb010d6e75dc?w=600&auto=format&fit=crop&q=80",
    description: "Hawa Mahal & Royal Palaces of Rajasthan",
  },
  {
    id: "shimla",
    name: "Shimla",
    country: "India",
    code: "SLV",
    lat: 31.1048,
    lng: 77.1734,
    imageUrl:
      "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=600&auto=format&fit=crop&q=80",
    description: "Colonial hill station surrounded by Himalayan mountains",
  },
  {
    id: "manali",
    name: "Manali",
    country: "India",
    code: "KUU",
    lat: 32.2432,
    lng: 77.1892,
    imageUrl:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&auto=format&fit=crop&q=80",
    description: "Snowy Himalayan mountains, valleys and adventure routes",
  },
  {
    id: "dharamshala",
    name: "Dharamshala",
    country: "India",
    code: "DHM",
    lat: 32.2190,
    lng: 76.3234,
    imageUrl:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&auto=format&fit=crop&q=80",
    description: "Scenic Himalayan town surrounded by cedar forests",
  },
  {
    id: "mcleodganj",
    name: "McLeod Ganj",
    country: "India",
    code: "MCG",
    lat: 32.2426,
    lng: 76.3213,
    imageUrl:
      "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=600&auto=format&fit=crop&q=80",
    description: "Mountain town with Tibetan culture and Himalayan views",
  },
  {
    id: "kasol",
    name: "Kasol",
    country: "India",
    code: "KSL",
    lat: 32.0099,
    lng: 77.3152,
    imageUrl:
      "https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?w=600&auto=format&fit=crop&q=80",
    description: "Beautiful Parvati Valley surrounded by mountains and forests",
  },
  {
    id: "spiti",
    name: "Spiti Valley",
    country: "India",
    code: "SPI",
    lat: 32.2461,
    lng: 78.0348,
    imageUrl:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=600&auto=format&fit=crop&q=80",
    description: "High-altitude cold desert with dramatic Himalayan landscapes",
  },
  {
    id: "kaza",
    name: "Kaza",
    country: "India",
    code: "KAZ",
    lat: 32.2265,
    lng: 78.0717,
    imageUrl:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&auto=format&fit=crop&q=80",
    description: "Remote Himalayan town in the heart of Spiti Valley",
  },
  {
    id: "dalhousie",
    name: "Dalhousie",
    country: "India",
    code: "DLH",
    lat: 32.5387,
    lng: 75.9700,
    imageUrl:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&auto=format&fit=crop&q=80",
    description: "Peaceful colonial hill station with panoramic mountain views",
  },
  {
    id: "khajjiar",
    name: "Khajjiar",
    country: "India",
    code: "KHJ",
    lat: 32.5556,
    lng: 76.0667,
    imageUrl:
      "https://images.unsplash.com/photo-1609948543911-7c1c2a3b22d1?w=600&auto=format&fit=crop&q=80",
    description: "Green meadows surrounded by dense forests and Himalayan peaks",
  },
  {
    id: "kathmandu",
    name: "Kathmandu",
    country: "Nepal",
    code: "KTM",
    lat: 27.72,
    lng: 85.32,
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&auto=format&fit=crop&q=80",
    description: "Himalayan gateways & ancient temples",
  },
  {
    id: "colombo",
    name: "Colombo",
    country: "Sri Lanka",
    code: "CMB",
    lat: 6.93,
    lng: 79.86,
    imageUrl: "https://images.unsplash.com/photo-1588598198321-9735fd52455b?w=600&auto=format&fit=crop&q=80",
    description: "Coastal port & historic Fort district",
  },
  {
    id: "male",
    name: "Maldives",
    country: "Maldives",
    code: "MLE",
    lat: 4.18,
    lng: 73.53,
    imageUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&auto=format&fit=crop&q=80",
    description: "Crystal blue atolls & overwater villas",
  },
  {
    id: "dhaka",
    name: "Dhaka",
    country: "Bangladesh",
    code: "DAC",
    lat: 23.81,
    lng: 90.41,
    imageUrl: "https://images.unsplash.com/photo-1609137144822-44a6713bb923?w=600&auto=format&fit=crop&q=80",
    description: "Lalbagh Fort & vibrant riverfront",
  },
  {
    id: "islamabad",
    name: "Islamabad",
    country: "Pakistan",
    code: "ISB",
    lat: 33.68,
    lng: 73.05,
    imageUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=600&auto=format&fit=crop&q=80",
    description: "Faisal Mosque & Margalla Hills",
  },

  // East & Southeast Asia
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    code: "HND",
    lat: 35.68,
    lng: 139.65,
    imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80",
    description: "Shibuya Crossing & Tokyo Tower",
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    code: "UKY",
    lat: 35.01,
    lng: 135.77,
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80",
    description: "Fushimi Inari Shrine & Bamboo Groves",
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    code: "ICN",
    lat: 37.57,
    lng: 126.98,
    imageUrl: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600&auto=format&fit=crop&q=80",
    description: "Gyeongbokgung Palace & N Seoul Tower",
  },
  {
    id: "beijing",
    name: "Beijing",
    country: "China",
    code: "PEK",
    lat: 39.9,
    lng: 116.4,
    imageUrl: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&auto=format&fit=crop&q=80",
    description: "The Great Wall & Forbidden City",
  },
  {
    id: "shanghai",
    name: "Shanghai",
    country: "China",
    code: "PVG",
    lat: 31.23,
    lng: 121.47,
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&auto=format&fit=crop&q=80",
    description: "The Bund skyline & Oriental Pearl Tower",
  },
  {
    id: "hong-kong",
    name: "Hong Kong",
    country: "Hong Kong",
    code: "HKG",
    lat: 22.32,
    lng: 114.17,
    imageUrl: "https://images.unsplash.com/photo-1506970845246-18f21d533b20?w=600&auto=format&fit=crop&q=80",
    description: "Victoria Harbour & Victoria Peak",
  },
  {
    id: "singapore",
    name: "Singapore Marina",
    country: "Singapore",
    code: "SIN",
    lat: 1.35,
    lng: 103.82,
    imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&auto=format&fit=crop&q=80",
    description: "Marina Bay Sands & Gardens by the Bay",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    code: "BKK",
    lat: 13.76,
    lng: 100.5,
    imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&auto=format&fit=crop&q=80",
    description: "Wat Arun & bustling river markets",
  },
  {
    id: "phuket",
    name: "Phuket",
    country: "Thailand",
    code: "HKT",
    lat: 7.88,
    lng: 98.39,
    imageUrl: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=600&auto=format&fit=crop&q=80",
    description: "Andaman Sea beaches & Phi Phi islands",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    code: "DPS",
    lat: -8.34,
    lng: 115.09,
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop&q=80",
    description: "Ubud rice terraces & sacred temples",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    code: "KUL",
    lat: 3.14,
    lng: 101.69,
    imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&auto=format&fit=crop&q=80",
    description: "Petronas Twin Towers & Batu Caves",
  },
  {
    id: "hanoi",
    name: "Hanoi",
    country: "Vietnam",
    code: "HAN",
    lat: 21.03,
    lng: 105.83,
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
    description: "Old Quarter & scenic Hoan Kiem Lake",
  },
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    code: "MNL",
    lat: 14.6,
    lng: 120.98,
    imageUrl: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600&auto=format&fit=crop&q=80",
    description: "Historic Intramuros & Manila Bay sunsets",
  },
  {
    id: "taipei",
    name: "Taipei",
    country: "Taiwan",
    code: "TPE",
    lat: 25.03,
    lng: 121.57,
    imageUrl: "https://images.unsplash.com/photo-1508248467877-aec1b08de376?w=600&auto=format&fit=crop&q=80",
    description: "Taipei 101 tower & bustling night markets",
  },

  // Middle East & West Asia
  {
    id: "dubai",
    name: "Dubai Downtown",
    country: "United Arab Emirates",
    code: "DXB",
    lat: 25.2,
    lng: 55.27,
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop&q=80",
    description: "Burj Khalifa & Futuristic Skyline",
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    country: "United Arab Emirates",
    code: "AUH",
    lat: 24.45,
    lng: 54.38,
    imageUrl: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&auto=format&fit=crop&q=80",
    description: "Sheikh Zayed Grand Mosque & Louvre",
  },
  {
    id: "doha",
    name: "Doha",
    country: "Qatar",
    code: "DOH",
    lat: 25.29,
    lng: 51.53,
    imageUrl: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&auto=format&fit=crop&q=80",
    description: "Museum of Islamic Art & Corniche waterfront",
  },
  {
    id: "riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    code: "RUH",
    lat: 24.71,
    lng: 46.68,
    imageUrl: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=600&auto=format&fit=crop&q=80",
    description: "Kingdom Centre & historic Diriyah",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    code: "IST",
    lat: 41.01,
    lng: 28.98,
    imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&auto=format&fit=crop&q=80",
    description: "Hagia Sophia & Bosphorus Strait bridge",
  },
  {
    id: "amman",
    name: "Petra & Amman",
    country: "Jordan",
    code: "AMM",
    lat: 31.95,
    lng: 35.93,
    imageUrl: "https://images.unsplash.com/photo-1579606032834-d40f8a84615a?w=600&auto=format&fit=crop&q=80",
    description: "Ancient Rose City of Petra & Citadel",
  },
  {
    id: "muscat",
    name: "Muscat",
    country: "Oman",
    code: "MCT",
    lat: 23.59,
    lng: 58.41,
    imageUrl: "https://images.unsplash.com/photo-1578895101405-3e28404a3eb3?w=600&auto=format&fit=crop&q=80",
    description: "Sultan Qaboos Grand Mosque & Mutrah Corniche",
  },

  // Europe
  {
    id: "london",
    name: "London City",
    country: "United Kingdom",
    code: "LHR",
    lat: 51.51,
    lng: -0.13,
    imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80",
    description: "Big Ben, Westminster & Historic Thames",
  },
  {
    id: "edinburgh",
    name: "Edinburgh",
    country: "United Kingdom",
    code: "EDI",
    lat: 55.95,
    lng: -3.19,
    imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&auto=format&fit=crop&q=80",
    description: "Edinburgh Castle & the Royal Mile",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    code: "CDG",
    lat: 48.86,
    lng: 2.35,
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80",
    description: "Eiffel Tower & City of Lights",
  },
  {
    id: "nice",
    name: "Nice & French Riviera",
    country: "France",
    code: "NCE",
    lat: 43.71,
    lng: 7.26,
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80",
    description: "Promenade des Anglais & Cote d'Azur",
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    code: "FCO",
    lat: 41.9,
    lng: 12.5,
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&auto=format&fit=crop&q=80",
    description: "Colosseum, Vatican & Roman Forum",
  },
  {
    id: "venice",
    name: "Venice",
    country: "Italy",
    code: "VCE",
    lat: 45.44,
    lng: 12.33,
    imageUrl: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=600&auto=format&fit=crop&q=80",
    description: "Gondolas on the Grand Canal & St. Mark's",
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    code: "BCN",
    lat: 41.39,
    lng: 2.17,
    imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&auto=format&fit=crop&q=80",
    description: "Sagrada Familia & Mediterranean coastline",
  },
  {
    id: "madrid",
    name: "Madrid",
    country: "Spain",
    code: "MAD",
    lat: 40.42,
    lng: -3.7,
    imageUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&auto=format&fit=crop&q=80",
    description: "Royal Palace & Gran Via boulevard",
  },
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    code: "BER",
    lat: 52.52,
    lng: 13.4,
    imageUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&auto=format&fit=crop&q=80",
    description: "Brandenburg Gate & historic architecture",
  },
  {
    id: "munich",
    name: "Munich & Bavarian Alps",
    country: "Germany",
    code: "MUC",
    lat: 48.14,
    lng: 11.58,
    imageUrl: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=600&auto=format&fit=crop&q=80",
    description: "Marienplatz & Neuschwanstein Castle",
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    code: "AMS",
    lat: 52.37,
    lng: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=600&auto=format&fit=crop&q=80",
    description: "Iconic canals & historic bridges",
  },
  {
    id: "zurich",
    name: "Zurich & Swiss Alps",
    country: "Switzerland",
    code: "ZRH",
    lat: 47.38,
    lng: 8.54,
    imageUrl: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600&auto=format&fit=crop&q=80",
    description: "Lake Zurich & snow-capped Alpine peaks",
  },
  {
    id: "athens",
    name: "Athens",
    country: "Greece",
    code: "ATH",
    lat: 37.98,
    lng: 23.73,
    imageUrl: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&auto=format&fit=crop&q=80",
    description: "The Acropolis & Parthenon temple",
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    code: "JTR",
    lat: 36.39,
    lng: 25.46,
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&auto=format&fit=crop&q=80",
    description: "Whitewashed cliffs & Aegean sunsets",
  },
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    code: "LIS",
    lat: 38.72,
    lng: -9.14,
    imageUrl: "https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=600&auto=format&fit=crop&q=80",
    description: "Belem Tower & historic yellow trams",
  },
  {
    id: "vienna",
    name: "Vienna",
    country: "Austria",
    code: "VIE",
    lat: 48.21,
    lng: 16.37,
    imageUrl: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&auto=format&fit=crop&q=80",
    description: "Schonbrunn Palace & classical music heritage",
  },
  {
    id: "prague",
    name: "Prague",
    country: "Czech Republic",
    code: "PRG",
    lat: 50.08,
    lng: 14.44,
    imageUrl: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=600&auto=format&fit=crop&q=80",
    description: "Charles Bridge & medieval Old Town Square",
  },
  {
    id: "dublin",
    name: "Dublin",
    country: "Ireland",
    code: "DUB",
    lat: 53.35,
    lng: -6.26,
    imageUrl: "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=600&auto=format&fit=crop&q=80",
    description: "Temple Bar & Trinity College Long Room",
  },
  {
    id: "stockholm",
    name: "Stockholm",
    country: "Sweden",
    code: "ARN",
    lat: 59.33,
    lng: 18.07,
    imageUrl: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=600&auto=format&fit=crop&q=80",
    description: "Gamla Stan archipelago & royal palaces",
  },
  {
    id: "oslo",
    name: "Oslo & Fjords",
    country: "Norway",
    code: "OSL",
    lat: 59.91,
    lng: 10.75,
    imageUrl: "https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?w=600&auto=format&fit=crop&q=80",
    description: "Oslo Opera House & majestic Norwegian fjords",
  },
  {
    id: "copenhagen",
    name: "Copenhagen",
    country: "Denmark",
    code: "CPH",
    lat: 55.68,
    lng: 12.57,
    imageUrl: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&auto=format&fit=crop&q=80",
    description: "Nyhavn harbor & colorful waterfront facades",
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    code: "KEF",
    lat: 64.15,
    lng: -21.94,
    imageUrl: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&auto=format&fit=crop&q=80",
    description: "Hallgrimskirkja, waterfalls & Northern Lights",
  },

  // North America
  {
    id: "new-york",
    name: "New York City",
    country: "United States",
    code: "JFK",
    lat: 40.71,
    lng: -74.01,
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop&q=80",
    description: "Manhattan Skyline & Times Square",
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "United States",
    code: "LAX",
    lat: 34.05,
    lng: -118.24,
    imageUrl: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=600&auto=format&fit=crop&q=80",
    description: "Hollywood Hills, Santa Monica & Pacific Coast",
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    country: "United States",
    code: "SFO",
    lat: 37.77,
    lng: -122.42,
    imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&auto=format&fit=crop&q=80",
    description: "Golden Gate Bridge & iconic cable cars",
  },
  {
    id: "miami",
    name: "Miami Beach",
    country: "United States",
    code: "MIA",
    lat: 25.76,
    lng: -80.19,
    imageUrl: "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=600&auto=format&fit=crop&q=80",
    description: "Art Deco district & South Beach sunshine",
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    country: "United States",
    code: "LAS",
    lat: 36.17,
    lng: -115.14,
    imageUrl: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=600&auto=format&fit=crop&q=80",
    description: "The Las Vegas Strip & Grand Canyon gateway",
  },
  {
    id: "honolulu",
    name: "Honolulu Hawaii",
    country: "United States",
    code: "HNL",
    lat: 21.31,
    lng: -157.86,
    imageUrl: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&auto=format&fit=crop&q=80",
    description: "Waikiki Beach & Diamond Head volcanic crater",
  },
  {
    id: "toronto",
    name: "Toronto",
    country: "Canada",
    code: "YYZ",
    lat: 43.65,
    lng: -79.38,
    imageUrl: "https://images.unsplash.com/photo-1507992781348-310259076fa0?w=600&auto=format&fit=crop&q=80",
    description: "CN Tower & Lake Ontario waterfront",
  },
  {
    id: "vancouver",
    name: "Vancouver",
    country: "Canada",
    code: "YVR",
    lat: 49.28,
    lng: -123.12,
    imageUrl: "https://images.unsplash.com/photo-1559511260-66a65e09b245?w=600&auto=format&fit=crop&q=80",
    description: "Stanley Park & coastal mountain backdrop",
  },
  {
    id: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    code: "MEX",
    lat: 19.43,
    lng: -99.13,
    imageUrl: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&auto=format&fit=crop&q=80",
    description: "Zocalo, Chapultepec Castle & Aztec heritage",
  },
  {
    id: "cancun",
    name: "Cancun",
    country: "Mexico",
    code: "CUN",
    lat: 21.16,
    lng: -86.85,
    imageUrl: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&auto=format&fit=crop&q=80",
    description: "Caribbean turquoise waters & Mayan ruins",
  },

  // South America
  {
    id: "rio-de-janeiro",
    name: "Rio de Janeiro",
    country: "Brazil",
    code: "GIG",
    lat: -22.91,
    lng: -43.17,
    imageUrl: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&auto=format&fit=crop&q=80",
    description: "Christ the Redeemer & Copacabana beach",
  },
  {
    id: "sao-paulo",
    name: "Sao Paulo",
    country: "Brazil",
    code: "GRU",
    lat: -23.55,
    lng: -46.63,
    imageUrl: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=600&auto=format&fit=crop&q=80",
    description: "Paulista Avenue & culinary metropolis",
  },
  {
    id: "buenos-aires",
    name: "Buenos Aires",
    country: "Argentina",
    code: "EZE",
    lat: -34.6,
    lng: -58.38,
    imageUrl: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600&auto=format&fit=crop&q=80",
    description: "Obelisk, tango clubs & historic La Boca",
  },
  {
    id: "cusco",
    name: "Cusco & Machu Picchu",
    country: "Peru",
    code: "CUZ",
    lat: -13.53,
    lng: -71.97,
    imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600&auto=format&fit=crop&q=80",
    description: "Inca citadel in the Andes mountains",
  },
  {
    id: "santiago",
    name: "Santiago",
    country: "Chile",
    code: "SCL",
    lat: -33.45,
    lng: -70.67,
    imageUrl: "https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?w=600&auto=format&fit=crop&q=80",
    description: "Plaza de Armas & Andes mountain valley",
  },
  {
    id: "bogota",
    name: "Bogota",
    country: "Colombia",
    code: "BOG",
    lat: 4.71,
    lng: -74.07,
    imageUrl: "https://images.unsplash.com/photo-1583492080766-3d23192f15f0?w=600&auto=format&fit=crop&q=80",
    description: "Monserrate hill & colonial La Candelaria",
  },

  // Africa
  {
    id: "cairo",
    name: "Cairo & Pyramids",
    country: "Egypt",
    code: "CAI",
    lat: 30.04,
    lng: 31.24,
    imageUrl: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=600&auto=format&fit=crop&q=80",
    description: "Great Pyramids of Giza & River Nile",
  },
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    code: "CPT",
    lat: -33.92,
    lng: 18.42,
    imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&auto=format&fit=crop&q=80",
    description: "Table Mountain & scenic Cape Peninsula",
  },
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    code: "RAK",
    lat: 31.63,
    lng: -7.98,
    imageUrl: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&auto=format&fit=crop&q=80",
    description: "Jemaa el-Fnaa square & Medina souks",
  },
  {
    id: "nairobi",
    name: "Nairobi & Safari",
    country: "Kenya",
    code: "NBO",
    lat: -1.29,
    lng: 36.82,
    imageUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&auto=format&fit=crop&q=80",
    description: "Nairobi National Park & wildlife safari",
  },
  {
    id: "zanzibar",
    name: "Zanzibar",
    country: "Tanzania",
    code: "ZNZ",
    lat: -6.16,
    lng: 39.2,
    imageUrl: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=600&auto=format&fit=crop&q=80",
    description: "Stone Town & Indian Ocean white sands",
  },
  {
    id: "mauritius",
    name: "Mauritius",
    country: "Mauritius",
    code: "MRU",
    lat: -20.35,
    lng: 57.55,
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop&q=80",
    description: "Le Morne Brabant & turquoise coral reefs",
  },

  // Oceania & Australia
  {
    id: "sydney",
    name: "Sydney Harbour",
    country: "Australia",
    code: "SYD",
    lat: -33.87,
    lng: 151.21,
    imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&auto=format&fit=crop&q=80",
    description: "Sydney Opera House & Harbour Bridge",
  },
  {
    id: "melbourne",
    name: "Melbourne",
    country: "Australia",
    code: "MEL",
    lat: -37.81,
    lng: 144.96,
    imageUrl: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=600&auto=format&fit=crop&q=80",
    description: "Flinders Street Station & cultural laneways",
  },
  {
    id: "auckland",
    name: "Auckland",
    country: "New Zealand",
    code: "AKL",
    lat: -36.85,
    lng: 174.76,
    imageUrl: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=600&auto=format&fit=crop&q=80",
    description: "Sky Tower & Waitemata Harbour",
  },
  {
    id: "queenstown",
    name: "Queenstown",
    country: "New Zealand",
    code: "ZQN",
    lat: -45.03,
    lng: 168.66,
    imageUrl: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=600&auto=format&fit=crop&q=80",
    description: "Lake Wakatipu & Southern Alps scenery",
  },
  {
    id: "fiji",
    name: "Fiji Islands",
    country: "Fiji",
    code: "NAN",
    lat: -17.77,
    lng: 177.44,
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    description: "South Pacific lagoons & palm-fringed coral reefs",
  },
];

export const transportLabels: Record<Transport, string> = {
  flight: "Flight ✈️",
  car: "Car 🚗",
  bike: "Bike 🏍️",
  taxi: "Taxi 🚕",
  train: "Train 🚆",
  bus: "Bus 🚌",
  bicycle: "Bicycle 🚲",
  walking: "Walk 🚶",
  ship: "Ship 🚢",
};
