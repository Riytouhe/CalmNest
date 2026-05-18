import { createContext, useContext, useState, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  C: typeof DARK;
}

const DARK = {
  bg: "#0A0A0F",
  surface: "#13131A",
  surface2: "#1C1C28",
  accent: "#7C5CFC",
  teal: "#00E5BF",
  coral: "#FF6B6B",
  amber: "#FFB347",
  text: "#FFFFFF",
  sub: "#A0A0B8",
  muted: "#50506A",
  border: "#2A2A3A",
};

const LIGHT = {
  bg: "#F4F4F8",
  surface: "#FFFFFF",
  surface2: "#EEEEF6",
  accent: "#7C5CFC",
  teal: "#00C4A3",
  coral: "#FF6B6B",
  amber: "#FFB347",
  text: "#0A0A0F",
  sub: "#5A5A7A",
  muted: "#9898B0",
  border: "#DCDCE8",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  C: DARK,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const C = theme === "dark" ? DARK : LIGHT;
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
