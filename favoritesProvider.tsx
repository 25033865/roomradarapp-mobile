import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const FAVORITES_STORAGE_KEY = "roomradar:favorites";

export type FavoritePlace = {
  id: string;
  name: string;
  location: string;
  rating: string;
  image: string;
};

interface FavoritesContextType {
  favorites: FavoritePlace[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (place: FavoritePlace) => void;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  clearFavorites: () => {},
});

const isFavoritePlace = (value: unknown): value is FavoritePlace => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const place = value as Record<string, unknown>;
  return (
    typeof place.id === "string" &&
    typeof place.name === "string" &&
    typeof place.location === "string" &&
    typeof place.rating === "string" &&
    typeof place.image === "string"
  );
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!stored) {
          return;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed) || !isMounted) {
          return;
        }

        setFavorites(parsed.filter(isFavoritePlace));
      } catch {
        // Ignore malformed or unavailable storage values.
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites)).catch(
      () => {
        // Ignore storage failures; favorites still work in-memory.
      }
    );
  }, [favorites]);

  const isFavorite = useCallback(
    (id: string) => favorites.some((place) => place.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((place: FavoritePlace) => {
    setFavorites((prev) => {
      const alreadyFavorited = prev.some((item) => item.id === place.id);
      if (alreadyFavorited) {
        return prev.filter((item) => item.id !== place.id);
      }

      return [place, ...prev];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
    }),
    [favorites, isFavorite, toggleFavorite, clearFavorites]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => useContext(FavoritesContext);
