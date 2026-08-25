import { AppFonts, Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UMBRALES_MEDALLA } from "../../constants/medallas";
import { useAjustesCtx } from "../../context/AjustesContext";

type ColorPair = { bg: string; text: string };
type BadgeVariant = "purple" | "green" | "orange" | "red" | "neutral";
const C = {
  bg: "#FBF6F0",
  surface: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  textPrimary: "#1A1A1A",
  textMuted: "#7A7A7A",
};

const BADGE_COLORS: Record<BadgeVariant, ColorPair> = {
  purple: { bg: "#F4F0F6", text: "#7B5A9A" },
  green: { bg: "#EEF9E2", text: "#3B6D11" },
  orange: { bg: "#FFF2EC", text: "#B8562F" },
  red: { bg: "#FDEDED", text: "#C43D3D" },
  neutral: { bg: "#F3F3F3", text: "#8A8194" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { escala } = useAjustesCtx();
  return (
    <Text
      style={[estilos.sectionTitle, { fontSize: Math.round(11 * escala) }]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

function Badge({
  label,
  variant = "purple",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const { escala } = useAjustesCtx();
  const cfg = BADGE_COLORS[variant];
  return (
    <View
      style={[estilos.badge, { backgroundColor: cfg.bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        style={[
          estilos.badgeText,
          { fontSize: Math.round(12 * escala), color: cfg.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

type RuleRowProps = {
  title: string;
  badge: string;
  badgeVariant?: BadgeVariant;
  last?: boolean;
  subtitle?: string;
};

function RuleRow({
  title,
  badge,
  badgeVariant = "purple",
  subtitle,
  last = false,
}: RuleRowProps) {
  const { escala } = useAjustesCtx();

  const a11yLabel = subtitle
    ? `${title}. ${subtitle}. ${badge}`
    : `${title}. ${badge}`;

  return (
    <View
      style={[estilos.row, last && estilos.rowLast]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <View style={estilos.rowContent}>
        <Text
          style={[estilos.rowTitle, { fontSize: Math.round(14 * escala) }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[estilos.rowSubtitle, { fontSize: Math.round(12 * escala) }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Badge label={badge} variant={badgeVariant} />
    </View>
  );
}

function Card({
  children,
  a11yLabel,
}: {
  children: React.ReactNode;
  a11yLabel?: string;
}) {
  return (
    <View
      style={estilos.card}
      accessible={false}
      accessibilityLabel={a11yLabel}
    >
      {children}
    </View>
  );
}

function MedalCard({
  icon,
  name,
  req,
}: {
  icon: string;
  name: string;
  req: string;
}) {
  const { escala } = useAjustesCtx();
  return (
    <View
      style={estilos.medalCard}
      accessible
      accessibilityLabel={`Medalla de ${name}, se consigue con ${req}`}
    >
      <Text
        style={estilos.medalIcon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {icon}
      </Text>
      <Text
        style={[estilos.medalName, { fontSize: Math.round(13 * escala) }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {name}
      </Text>
      <Text
        style={[estilos.medalReq, { fontSize: Math.round(12 * escala) }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {req}
      </Text>
    </View>
  );
}

export default function NormasJuego() {
  const router = useRouter();
  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.container}
        showsVerticalScrollIndicator={false}
        accessible={false}
      >
        {/* Cabecera */}
        <View style={estilos.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={estilos.backBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.purpleDk} />
          </Pressable>
          <Text style={estilos.headerTitle} accessibilityRole="header">
            Normas del juego
          </Text>
        </View>

        {/* ── Programar tareas ── */}
        <SectionTitle>Programar tareas</SectionTitle>
        <Card>
          <RuleRow title="Tarea puntual" badge="Inicio / Calendario" />
          <RuleRow
            title="Tarea repetitiva diaria o semanal"
            badge="Calendario"
            last
          />
        </Card>

        {/* ── Ganar estrellas ── */}
        <SectionTitle>Cómo ganar estrellas</SectionTitle>
        <Card>
          <RuleRow
            title="Tarea completada a tiempo o sin hora"
            badge="+5 estrellas"
            badgeVariant="green"
          />
          <RuleRow
            title="Tarea completada tarde"
            badge="+3 estrellas"
            badgeVariant="orange"
            last
          />
        </Card>

        {/* ── Penalizaciones ── */}
        <SectionTitle>Penalizaciones al final del día</SectionTitle>
        <Card>
          <RuleRow
            title="Tareas sin completar"
            subtitle="Se hizo algo, pero quedaron pendientes"
            badge="Menos 10 estrellas"
            badgeVariant="red"
            last
          />
        </Card>

        {/* ── Racha ── */}
        <SectionTitle>Racha diaria</SectionTitle>
        <Card>
          <RuleRow
            title="Racha activa"
            subtitle="Completas tareas días consecutivos"
            badge="Más 1 por día"
            badgeVariant="orange"
          />
          <RuleRow
            title="Racha rota"
            subtitle="Saltas un día sin completar nada"
            badge="Vuelve a 0"
            badgeVariant="neutral"
            last
          />
        </Card>

        {/* ── Medallas ── */}
        <SectionTitle>Medallas</SectionTitle>
        <View
          style={estilos.medalGrid}
          accessible={false}
          accessibilityLabel="Cuadrícula de medallas"
        >
          <MedalCard
            icon="🥉"
            name="Bronce"
            req={`${UMBRALES_MEDALLA.bronce} ⭐`}
          />
          <MedalCard
            icon="🥈"
            name="Plata"
            req={`${UMBRALES_MEDALLA.plata} ⭐`}
          />
          <MedalCard icon="🥇" name="Oro" req={`${UMBRALES_MEDALLA.oro} ⭐`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  container: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F4F0F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    flexShrink: 1,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: AppFonts.bodyBold,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    gap: 12,
    minHeight: 52,
  },
  rowLast: { borderBottomWidth: 0 },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontFamily: AppFonts.bodyBold,
    color: C.textPrimary,
    marginBottom: 1,
  },
  rowSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    fontFamily: AppFonts.body,
    lineHeight: 16,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: AppFonts.bodyBold,
  },

  medalGrid: { flexDirection: "row", gap: 8, width: "100%" },
  medalCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 90,
  },
  medalIcon: { fontSize: 26, marginBottom: 6 },
  medalName: {
    fontSize: 13,
    fontFamily: AppFonts.bodyBold,
    color: C.textPrimary,
    marginBottom: 2,
  },
  medalReq: { fontSize: 12, color: C.textMuted, fontFamily: AppFonts.body },
});
