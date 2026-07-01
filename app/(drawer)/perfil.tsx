import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useState } from 'react';
import {
  Image, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useAvatar } from '../../context/AvatarContext';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TONOS_PIEL   = ['#F5C89A', '#7B3F2C'];
const COLORES_PELO = ['#1a1a1a', '#3B1F0E', '#8B4513', '#DAA520', '#E8C47A', '#E8E8E8'];
const NOMBRES_TONO = ['Claro', 'Oscuro'];
const NOMBRES_PELO = ['Negro', 'Marrón oscuro', 'Castaño', 'Rubio oscuro', 'Rubio claro', 'Blanco'];

const PURPLE = '#e9d3f5';

const TABS = [
  { id: 'piel',      icon: 'palette-outline',     title: 'Tono de piel' },
  { id: 'cara',      icon: 'emoticon-outline',     title: 'Cara' },
  { id: 'pelo',      icon: 'hair-dryer-outline',   title: 'Pelo' },
  { id: 'colorPelo', icon: 'brush-outline',        title: 'Color de pelo' },
  { id: 'camiseta',  icon: 'tshirt-crew-outline',  title: 'Camiseta' },
];

// ─── Imágenes (fuera del componente para que no se recreen en cada render) ────

const CARAS = [
  [
    require('../../assets/images/avatar/cara1_claro.png'),
    require('../../assets/images/avatar/cara2_claro.png'),
    require('../../assets/images/avatar/cara3_claro.png'),
  ],
  [
    require('../../assets/images/avatar/cara1_oscuro.png'),
    require('../../assets/images/avatar/cara2_oscuro.png'),
    require('../../assets/images/avatar/cara3_oscuro.png'),
  ],
];

const CAMISETAS = [
  [
    require('../../assets/images/avatar/camiseta1_claro.png'),
    require('../../assets/images/avatar/camiseta2_claro.png'),
  ],
  [
    require('../../assets/images/avatar/camiseta1_oscuro.png'),
    require('../../assets/images/avatar/camiseta2_oscuro.png'),
  ],
];

const PELO_CORTO_OPTIONS = [
  require('../../assets/images/avatar/pelo1.png'),
  require('../../assets/images/avatar/pelo3.png'),
];

const PELO_LARGO_OPTIONS = [
  require('../../assets/images/avatar/pelo5.png'),
  require('../../assets/images/avatar/pelo6.png'),
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AvatarPreviewProps {
  size?: number;
  si: 0 | 1;
  shirt: number;
  cara: number;
  peloCorto: number;
  peloLargo: number;
  colorPeloSeguro: string;
}

interface TabBarProps {
  tabActivo: string;
  onTabPress: (id: string) => void;
}

// ─── AvatarPreview ────────────────────────────────────────────────────────────
// Fuera de Perfil para que React no la desmonte/remonte en cada render del padre

const AvatarPreview = memo(function AvatarPreview({
  size = 290,
  si,
  shirt,
  cara,
  peloCorto,
  peloLargo,
  colorPeloSeguro,
}: AvatarPreviewProps) {
  return (
    <View
      style={{ width: size, height: size * 1.2, position: 'relative' }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image
        source={CAMISETAS[si][shirt] ?? CAMISETAS[0][0]}
        style={{ position: 'absolute', top: size * 0.70, left: -size * 0.12, width: size * 1.3, height: size * 1.3, zIndex: 3 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Image
        source={CARAS[si][cara] ?? CARAS[0][0]}
        style={{ position: 'absolute', top: -size * 0.02, left: 0, width: size, height: size, zIndex: 1 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {peloCorto >= 0 && PELO_CORTO_OPTIONS[peloCorto] && (
        <Image
          source={PELO_CORTO_OPTIONS[peloCorto]}
          style={{ position: 'absolute', top: -size * 0.28, left: size * -0.02, width: size * 1.05, height: size * 0.8, zIndex: 4, tintColor: colorPeloSeguro }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
      {peloCorto < 0 && peloLargo >= 0 && PELO_LARGO_OPTIONS[peloLargo] && (
        <Image
          source={PELO_LARGO_OPTIONS[peloLargo]}
          style={{ position: 'absolute', top: -size * 0.27, left: size * -0.1, width: size * 1.20, height: size * 1.20, zIndex: 4, tintColor: colorPeloSeguro }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
});

// ─── TabBar ───────────────────────────────────────────────────────────────────
// Fuera de Perfil por el mismo motivo que AvatarPreview

const TabBar = memo(function TabBar({ tabActivo, onTabPress, escala = 1 }: TabBarProps & { escala?: number }) {
  return (
    <View style={estilos.tabBar} accessible={false} accessibilityRole="tablist">
      {TABS.map(tab => (
        <Pressable
          key={tab.id}
          onPress={() => onTabPress(tab.id)}
          style={[estilos.tabBtn, tabActivo === tab.id && estilos.tabBtnActive]}
          accessible
          accessibilityRole="tab"
          accessibilityLabel={tab.title}
          accessibilityState={{ selected: tabActivo === tab.id }}
        >
          <Text style={[estilos.tabEmoji, { fontSize: Math.round(22 * escala) }, tabActivo === tab.id && { opacity: 1 }]}>
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Text>
          {tabActivo === tab.id && (
            <View
              style={estilos.tabActiveLine}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>
      ))}
    </View>
  );
});

// ─── Perfil ───────────────────────────────────────────────────────────────────

export default function Perfil() {
  const { escala, colores } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const { width }  = useWindowDimensions();
  const isTablet   = width >= 768;
  const { avatar, updateAvatar } = useAvatar();
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt } = avatar;

  const [tabActivo, setTabActivo] = useState('piel');
  const handleTabPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTabActivo(id);
  }, []);

  const si: 0 | 1        = tonoPiel === 1 ? 1 : 0;
  const colorPeloSeguro  = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];

  // ── Opciones según tab activo (useMemo evita re-render innecesario al cambiar avatar) ──

  const renderOpciones = useCallback(() => {
    switch (tabActivo) {

      case 'piel':
        return (
          <>
            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }]} accessibilityRole="header">Tono de piel</Text>
            <View style={estilos.gridColores} accessible={false}>
              {TONOS_PIEL.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('tonoPiel', i)}
                  style={[estilos.circleColor, { backgroundColor: color }, tonoPiel === i && estilos.circleSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Tono de piel ${NOMBRES_TONO[i]}`}
                  accessibilityState={{ selected: tonoPiel === i }}
                />
              ))}
            </View>
          </>
        );

      case 'cara':
        return (
          <>
            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }]} accessibilityRole="header">Cara</Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {CARAS[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('cara', i)}
                  style={[estilos.imgCard, cara === i && estilos.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Cara opción ${i + 1}`}
                  accessibilityState={{ selected: cara === i }}
                >
                  <Image
                    source={img}
                    style={estilos.imgCardImg}
                    resizeMode="contain"
                    accessibilityElementsHidden importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>
          </>
        );

      case 'pelo':
        return (
          <>
            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }]} accessibilityRole="header">Pelo corto</Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {PELO_CORTO_OPTIONS.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloCorto', i); updateAvatar('peloLargo', -1); }}
                  style={[estilos.imgCard, peloCorto === i && estilos.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Pelo corto opción ${i + 1}`}
                  accessibilityState={{ selected: peloCorto === i }}
                >
                  <Image
                    source={img}
                    style={[estilos.imgCardImg, { tintColor: colorPeloSeguro }]}
                    resizeMode="contain"
                    accessibilityElementsHidden importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>

            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }, { marginTop: 20 }]} accessibilityRole="header">Pelo largo</Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {PELO_LARGO_OPTIONS.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloLargo', i); updateAvatar('peloCorto', -1); }}
                  style={[estilos.imgCard, peloLargo === i && estilos.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Pelo largo opción ${i + 1}`}
                  accessibilityState={{ selected: peloLargo === i }}
                >
                  <Image
                    source={img}
                    style={[estilos.imgCardImg, { tintColor: colorPeloSeguro }]}
                    resizeMode="contain"
                    accessibilityElementsHidden importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>
          </>
        );

      case 'colorPelo':
        return (
          <>
            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }]} accessibilityRole="header">Color de pelo</Text>
            <View style={estilos.gridColores} accessible={false}>
              {COLORES_PELO.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('colorPelo', i)}
                  style={[estilos.circleColor, { backgroundColor: color }, colorPelo === i && estilos.circleSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Color de pelo ${NOMBRES_PELO[i]}`}
                  accessibilityState={{ selected: colorPelo === i }}
                />
              ))}
            </View>
          </>
        );

      case 'camiseta':
        return (
          <>
            <Text style={[estilos.opcionTitulo, { fontSize: Math.round(16 * escala) }]} accessibilityRole="header">Camiseta</Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {CAMISETAS[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('shirt', i)}
                  style={[estilos.imgCard, shirt === i && estilos.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Camiseta opción ${i + 1}`}
                  accessibilityState={{ selected: shirt === i }}
                >
                  <Image
                    source={img}
                    style={estilos.imgCardImg}
                    resizeMode="contain"
                    accessibilityElementsHidden importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>
          </>
        );

      default: return null;
    }
  }, [tabActivo, si, tonoPiel, cara, peloCorto, peloLargo, colorPeloSeguro, shirt, updateAvatar]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const avatarProps: AvatarPreviewProps = {
    si, shirt, cara, peloCorto, peloLargo, colorPeloSeguro,
  };

  if (isTablet) {
    return (
      <View style={estilos.rootTablet}>
        <View
          style={estilos.leftPanel}
          accessible
          accessibilityLabel="Vista previa del avatar"
        >
          <View style={estilos.avatarBgTablet}>
            <AvatarPreview {...avatarProps} size={220} />
          </View>
        </View>
        <View style={estilos.rightPanel}>
          <TabBar tabActivo={tabActivo} onTabPress={handleTabPress} escala={escala} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={estilos.opcionesScroll}
            accessible={false}
          >
            {renderOpciones()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={estilos.rootMobile}>
      <View
        style={estilos.avatarBgMobile}
        accessible
        accessibilityLabel="Vista previa del avatar"
      >
        <AvatarPreview {...avatarProps} size={180} />
      </View>
      <View style={estilos.bottomPanel}>
        <TabBar tabActivo={tabActivo} onTabPress={handleTabPress} escala={escala} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.opcionesScroll}
          keyboardShouldPersistTaps="handled"
          accessible={false}
        >
          {renderOpciones()}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  rootTablet: {
    flex: 1, flexDirection: 'row', backgroundColor: '#fff',
    borderColor: '#EEE', borderWidth: 2, borderRadius: 14, overflow: 'hidden',
    width: 700, height: 500, alignSelf: 'center', marginTop: 40,
  },
  leftPanel:      { width: 320, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  avatarBgTablet: { width: 280, height: 320, alignItems: 'center', justifyContent: 'center' },
  rightPanel:     { flex: 1, backgroundColor: '#fff' },

  rootMobile:     { flex: 1, backgroundColor: '#fff' },
  avatarBgMobile: { width: '100%', height: 500, backgroundColor: PURPLE, marginTop: -80, paddingBottom: 20, justifyContent: 'center', alignItems: 'center' },
  bottomPanel:    { flex: 1, backgroundColor: '#fff' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5, borderBottomColor: '#EEE',
    backgroundColor: '#fff',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, position: 'relative', opacity: .45,
    minHeight: 52,
  },
  tabBtnActive:  { opacity: 1 },
  tabEmoji:      { fontSize: 22 },
  tabActiveLine: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 3, borderRadius: 2, backgroundColor: PURPLE },

  opcionesScroll: { padding: 20, paddingBottom: 40 },
  opcionTitulo:   { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 14 },

  gridColores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  circleColor: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: '#DDD',
  },
  circleSelected: {
    borderWidth: 4, borderColor: PURPLE,
    shadowColor: PURPLE, shadowOpacity: .4, shadowRadius: 6, elevation: 4,
  },

  gridImagenes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgCard: {
    width: 88, height: 88, borderRadius: 14,
    borderWidth: 2, borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  imgCardSelected: {
    borderColor: PURPLE, borderWidth: 3,
    backgroundColor: '#F0E8F8',
    shadowColor: PURPLE, shadowOpacity: .3, shadowRadius: 6, elevation: 4,
  },
  imgCardImg: { width: 72, height: 72 },
});