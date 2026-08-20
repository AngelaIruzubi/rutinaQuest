# RutinaQuest

Aplicación móvil de gestión de rutinas con gamificación, desarrollada con **React Native + Expo**.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- npm (incluido con Node.js)

---

## Instalación y ejecución

### 1. Clona el repositorio

```bash
git clone <url-del-repositorio>
cd <nombre-del-proyecto>
```

### 2. Instala las dependencias

```bash
npm install
```

### 3. Inicia el servidor de desarrollo

```bash
npx expo start --dev-client
```

Aparecerá un **código QR** en la terminal.

---

## Ver la app en el móvil (recomendado)

Esta es la forma recomendada para disfrutar de **todas las funcionalidades**, incluyendo las notificaciones.

Este proyecto usa módulos nativos personalizados (notificaciones, Sentry), así que **la app de Expo Go de las tiendas no sirve** — hace falta un _development build_ propio:

1. Genera tu build de desarrollo instalable (solo hace falta una vez, o cuando cambien las dependencias nativas):

   ```bash
   eas build --profile development --platform android
   ```

   Instala el `.apk` que te da el enlace de EAS en tu móvil.

2. Con el servidor arrancado (`npx expo start --dev-client`), abre esa app en el móvil y escanea el QR.

3. La app se cargará directamente en tu dispositivo.

El ordenador y el móvil deben estar conectados a la **misma red Wi-Fi**.

---

## Ver la app en el navegador

Si prefieres no usar el móvil, puedes abrirla en el navegador con:

```bash
npx expo start --web
```

**Nota:** En la versión web las **notificaciones push no están disponibles**. Para probar esa funcionalidad hace falta el _development build_ en un dispositivo móvil (ver sección anterior).

---

## Funcionalidades principales

| Pantalla     | Descripción                                               |
| ------------ | --------------------------------------------------------- |
| Tareas       | Gestión de tareas diarias con prioridades y temporizador  |
| Calendario   | Vista semanal del historial de actividad                  |
| Progreso     | Estrellas, racha diaria y medallas (Bronce / Plata / Oro) |
| Historial    | Registro de tareas completadas con búsqueda               |
| Temporizador | Contador por tarea con configuración personalizada        |
| Ajustes      | Personalización visual, notificaciones y exportación      |
| Perfil       | Avatar y estadísticas del usuario                         |
| Normas       | Reglas del sistema de gamificación                        |

---

## Stack tecnológico

- **React Native** con **Expo** (SDK 54)
- **Expo Router** — navegación basada en archivos
- **AsyncStorage** — almacenamiento local en el dispositivo
- **Sentry** — reporte de errores en producción
- **TypeScript**

## Versión

RutinaQuest · v1.0
