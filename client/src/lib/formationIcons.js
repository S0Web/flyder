import {
  BookOpen, GraduationCap, Dumbbell, Users, Rocket, TrendingUp, Search,
  Package, Star, Award, Target, Lightbulb, Settings2, Layers, Compass,
  Zap, Heart, ShoppingBag, ClipboardList, MessageCircle,
} from 'lucide-react';

// Icônes proposées au manager pour illustrer une catégorie Formation. La clé
// (nom) est ce qui est stocké en base (colonne formation_categories.icone).
export const FORMATION_ICONS = {
  BookOpen, GraduationCap, Dumbbell, Users, Rocket, TrendingUp, Search,
  Package, Star, Award, Target, Lightbulb, Settings2, Layers, Compass,
  Zap, Heart, ShoppingBag, ClipboardList, MessageCircle,
};

export function formationIcon(nom) {
  return FORMATION_ICONS[nom] || BookOpen;
}
