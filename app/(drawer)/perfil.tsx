import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Image, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useAvatar } from '../../context/AvatarContext';

const TONOS_PIEL   = ['#F5C89A', '#7B3F2C'];
const COLORES_PELO = ['#1a1a1a', '#3B1F0E', '#8B4513', '#DAA520', '#E8C47A', '#E8E8E8'];
const NOMBRES_TONO = ['Claro', 'Oscuro'];
const NOMBRES_PELO = ['Negro', 'Marrón oscuro', 'Castaño', 'Rubio oscuro', 'Rubio claro', 'Blanco'];

const PURPLE = '#e9d3f5';
const BG     = '#EEF4FB';

const TABS = [
  { id: 'piel',      icon: 'palette-outline',     title: 'Tono de piel' },
  { id: 'cara',      icon: 'emoticon-outline',     title: 'Cara' },
  { id: 'pelo',      icon: 'hair-dryer-outline',   title: 'Pelo' },
  { id: 'colorPelo', icon: 'brush-outline',        title: 'Color de pelo' },
  { id: 'camiseta',  icon: 'tshirt-crew-outline',  title: 'Camiseta' },
];

export default function Perfil() {
  const { width }  = useWindowDimensions();
  const isTablet   = width >= 768;
  const { avatar, updateAvatar } = useAvatar();
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt } = avatar;

  const [tabActivo, setTabActivo] = (require('react').useState)('piel');

  const si: 0 | 1 = tonoPiel === 1 ? 1 : 0;

  const caras = [
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

  const camisetas = [
    [
      require('../../assets/images/avatar/camiseta1_claro.png'),
      require('../../assets/images/avatar/camiseta2_claro.png'),
    ],
    [
      require('../../assets/images/avatar/camiseta1_oscuro.png'),
      require('../../assets/images/avatar/camiseta2_oscuro.png'),
    ],
  ];

  const peloCortoOptions = [
    require('../../assets/images/avatar/pelo1.png'),
    require('../../assets/images/avatar/pelo3.png'),
  ];

  const peloLargoOptions = [
    require('../../assets/images/avatar/pelo5.png'),
    require('../../assets/images/avatar/pelo6.png'),
  ];

  const colorPeloSeguro = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];

  // ── Avatar preview — decorativo, oculto al VoiceOver ─────────────────────
  const AvatarPreview = ({ size = 290 }: { size?: number }) => (
    <View
      style={{ width: size, height: size * 1.2, position: 'relative' }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image
        source={camisetas[si][shirt] ?? camisetas[0][0]}
        style={{ position: 'absolute', top: size * 0.70, left: -size * 0.12, width: size * 1.3, height: size * 1.3, zIndex: 3 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Image
        source={caras[si][cara] ?? caras[0][0]}
        style={{ position: 'absolute', top: -size * 0.02, left: 0, width: size, height: size, zIndex: 1 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {peloCorto >= 0 && peloCortoOptions[peloCorto] && (
        <Image
          source={peloCortoOptions[peloCorto]}
          style={{ position: 'absolute', top: -size * 0.28, left: size * -0.02, width: size * 1.05, height: size * 0.8, zIndex: 4, tintColor: colorPeloSeguro }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
      {peloCorto < 0 && peloLargo >= 0 && peloLargoOptions[peloLargo] && (
        <Image
          source={peloLargoOptions[peloLargo]}
          style={{ position: 'absolute', top: -size * 0.27, left: size * -0.1, width: size * 1.20, height: size * 1.20, zIndex: 4, tintColor: colorPeloSeguro }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );

  // ── Panel de opciones según tab ───────────────────────────────────────────
  const renderOpciones = () => {
    switch (tabActivo) {

      case 'piel':
        return (
          <>
            <Text style={s.opcionTitulo} accessibilityRole="header">Tono de piel</Text>
            <View style={s.gridColores} accessible={false}>
              {TONOS_PIEL.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('tonoPiel', i)}
                  style={[s.circleColor, { backgroundColor: color }, tonoPiel === i && s.circleSelected]}
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
            <Text style={s.opcionTitulo} accessibilityRole="header">Cara</Text>
            <View style={s.gridImagenes} accessible={false}>
              {caras[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('cara', i)}
                  style={[s.imgCard, cara === i && s.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Cara opción ${i + 1}`}
                  accessibilityState={{ selected: cara === i }}
                >
                  <Image
                    source={img}
                    style={s.imgCardImg}
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
            <Text style={s.opcionTitulo} accessibilityRole="header">Pelo corto</Text>
            <View style={s.gridImagenes} accessible={false}>
              {peloCortoOptions.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloCorto', i); updateAvatar('peloLargo', -1); }}
                  style={[s.imgCard, peloCorto === i && s.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Pelo corto opción ${i + 1}`}
                  accessibilityState={{ selected: peloCorto === i }}
                >
                  <Image
                    source={img}
                    style={[s.imgCardImg, { tintColor: colorPeloSeguro }]}
                    resizeMode="contain"
                    accessibilityElementsHidden importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>

            <Text style={[s.opcionTitulo, { marginTop: 20 }]} accessibilityRole="header">Pelo largo</Text>
            <View style={s.gridImagenes} accessible={false}>
              {peloLargoOptions.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloLargo', i); updateAvatar('peloCorto', -1); }}
                  style={[s.imgCard, peloLargo === i && s.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Pelo largo opción ${i + 1}`}
                  accessibilityState={{ selected: peloLargo === i }}
                >
                  <Image
                    source={img}
                    style={[s.imgCardImg, { tintColor: colorPeloSeguro }]}
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
            <Text style={s.opcionTitulo} accessibilityRole="header">Color de pelo</Text>
            <View style={s.gridColores} accessible={false}>
              {COLORES_PELO.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('colorPelo', i)}
                  style={[s.circleColor, { backgroundColor: color }, colorPelo === i && s.circleSelected]}
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
            <Text style={s.opcionTitulo} accessibilityRole="header">Camiseta</Text>
            <View style={s.gridImagenes} accessible={false}>
              {camisetas[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('shirt', i)}
                  style={[s.imgCard, shirt === i && s.imgCardSelected]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Camiseta opción ${i + 1}`}
                  accessibilityState={{ selected: shirt === i }}
                >
                  <Image
                    source={img}
                    style={s.imgCardImg}
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
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TabBar = () => (
    <View style={s.tabBar} accessible={false} accessibilityRole="tablist">
      {TABS.map(tab => (
        <Pressable
          key={tab.id}
          onPress={() => setTabActivo(tab.id)}
          style={[s.tabBtn, tabActivo === tab.id && s.tabBtnActive]}
          accessible
          accessibilityRole="tab"
          accessibilityLabel={tab.title}
          accessibilityState={{ selected: tabActivo === tab.id }}
        >
          <Text style={[s.tabEmoji, tabActivo === tab.id && { opacity: 1 }]}>
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Text>
          {tabActivo === tab.id && (
            <View
              style={s.tabActiveLine}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>
      ))}
    </View>
  );

  if (isTablet) {
    return (
      <View style={s.rootTablet}>
        <View
          style={s.leftPanel}
          accessible
          accessibilityLabel="Vista previa del avatar"
        >
          <View style={s.avatarBgTablet}>
            <AvatarPreview size={220} />
          </View>
        </View>
        <View style={s.rightPanel}>
          <TabBar />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.opcionesScroll}
            accessible={false}
          >
            {renderOpciones()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={s.rootMobile}>
      <View
        style={s.avatarBgMobile}
        accessible
        accessibilityLabel="Vista previa del avatar"
      >
        <AvatarPreview size={180} />
      </View>
      <View style={s.bottomPanel}>
        <TabBar />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.opcionesScroll}
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
const s = StyleSheet.create({
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
    minHeight: 52, // zona táctil mínima
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
