<template>
  <div class="map-page">
    <div id="cesiumContainer"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Viewer } from 'cesium'

const viewer = ref(null)

onMounted(async () => {
  viewer.value = new Viewer('cesiumContainer', {
    baseLayerPicker: true,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    geocoder: false,
    selectionIndicator: false,
    infoBox: false
  });

  const imageryLayer = viewer.imageryLayers.addImageryProvider(
    await Cesium.IonImageryProvider.fromAssetId(3891169),
  );
  await viewer.zoomTo(imageryLayer);
})

onUnmounted(() => {
  if (viewer.value) {
    viewer.value.destroy()
  }
})
</script>

<style scoped>
.map-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>