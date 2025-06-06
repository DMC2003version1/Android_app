<template>
  <ion-app>
    <ion-router-outlet :key="$route.fullPath" />
  </ion-app>
</template>

<script>
import { IonApp, IonRouterOutlet } from '@ionic/vue';

export default {
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
  },
};
</script>