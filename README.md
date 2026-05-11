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
npx expo start
```

Aparecerá un **código QR** en la terminal.

---

## Ver la app en el móvil (recomendado)

Esta es la forma recomendada para disfrutar de **todas las funcionalidades**, incluyendo las notificaciones.

1. Instala **Expo Go** en tu móvil:
   - [Android — Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Abre Expo Go y escanea el QR que aparece en la terminal.

3. La app se cargará directamente en tu dispositivo.

El ordenador y el móvil deben estar conectados a la **misma red Wi-Fi**.

---

## Ver la app en el navegador

Si prefieres no usar el móvil, puedes abrirla en el navegador con:

```bash
npx expo start --web
```

**Nota:** En la versión web las **notificaciones push no están disponibles**. Para probar esa funcionalidad es necesario usar Expo Go en un dispositivo móvil.

---

## Funcionalidades principales

| Pantalla | Descripción |
|---|---|
| Tareas | Gestión de tareas diarias con prioridades y temporizador |
| Calendario | Vista semanal del historial de actividad |
| Progreso | Estrellas, racha diaria y medallas (Bronce / Plata / Oro) |
| Historial | Registro de tareas completadas con búsqueda |
| Temporizador | Contador por tarea con configuración personalizada |
| Ajustes | Personalización visual, notificaciones y exportación |
| Perfil | Avatar y estadísticas del usuario |
| Normas | Reglas del sistema de gamificación |

---

## Stack tecnológico

- **React Native** con **Expo** (SDK 51+)
- **Expo Router** — navegación basada en archivos
- **SQLite** — base de datos local en el dispositivo
- **TypeScript**

---

## Versión

RutinaQuest · v1.0