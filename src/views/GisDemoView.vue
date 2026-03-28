<template>
  <div class="gis-page">
    <div id="cesiumContainer"></div>
    <div class="controls">
      <button @click="measureDistance" :class="{ active: measureMode === 'distance' }">测距</button>
      <button @click="measureArea" :class="{ active: measureMode === 'area' }">测面</button>
      <button @click="clearAll">清除所有</button>
    </div>
    <div v-if="measureResult" class="measure-result">
      {{ measureResult }}
    </div>
    <div class="help-panel">
      <div class="help-title">操作说明</div>
      <div class="help-content">
        <p><span class="key">左键双击</span> 放置测量点/绘制元素</p>
        <p><span class="key">右键</span> 结束测量</p>
        <p><span class="key">右键拖动</span> 旋转视角</p>
        <p><span class="key">滚轮</span> 缩放</p>
        <p><span class="key">中键拖动</span> 平移</p>
      </div>
      <div class="help-divider"></div>
      <div class="help-title">功能说明</div>
      <div class="help-content">
        <p><span class="func">测距</span> 左键画点，右键结束</p>
        <p><span class="func">测面</span> 左键画3点以上，右键结束</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Viewer, Cartesian3, Color, PolygonHierarchy, ScreenSpaceEventHandler, ScreenSpaceEventType, LabelStyle, CallbackProperty } from 'cesium'
import * as CesiumNamespace from 'cesium'

const viewer = ref(null)
const entities = ref([])
const measureMode = ref(null)
const measureResult = ref('')
const activeShapePoints = ref([])
const activeShape = ref(null)
const floatingPoint = ref(null)
const measureHandler = ref(null)

onMounted(async () => {
  viewer.value = new Viewer('cesiumContainer', {
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    geocoder: false,
    selectionIndicator: false,
    infoBox: false
  })

  // 使用 OpenStreetMap 影像
  viewer.value.imageryLayers.addImageryProvider(
    new CesiumNamespace.OpenStreetMapImageryProvider({
      url: 'https://a.tile.openstreetmap.org/'
    })
  )

  // 初始化测量处理器
  initMeasureHandler()
})

// 初始化测量事件处理
const initMeasureHandler = () => {
  measureHandler.value = new ScreenSpaceEventHandler(viewer.value.scene.canvas)

  measureHandler.value.setInputAction((event) => {
    // 只有在测距或测面模式下才处理鼠标移动
    if (!measureMode.value) return
    if (!event.endPosition) return

    // 尝试使用 pickPosition
    let newPosition = null
    try {
      newPosition = viewer.value.scene.pickPosition(event.endPosition)
    } catch (e) {}

    // 如果 pickPosition 失败，尝试 pickEllipsoid
    if (!newPosition) {
      try {
        newPosition = viewer.value.scene.camera.pickEllipsoid(event.endPosition, viewer.value.scene.globe)
      } catch (e) {}
    }
    if (!newPosition) return

    if (activeShape.value && activeShapePoints.value.length > 0) {
      activeShapePoints.value.pop()
      activeShapePoints.value.push(newPosition)
    }
  }, ScreenSpaceEventType.MOUSE_MOVE)

  measureHandler.value.setInputAction((event) => {
    // 只有在测距或测面模式下才处理左键点击
    if (!measureMode.value) return
    if (!event.position) return

    // 尝试使用 pickPosition
    let earthPosition = null
    try {
      earthPosition = viewer.value.scene.pickPosition(event.position)
    } catch (e) {}

    // 如果 pickPosition 失败，尝试 pickEllipsoid
    if (!earthPosition) {
      try {
        earthPosition = viewer.value.scene.camera.pickEllipsoid(event.position, viewer.value.scene.globe)
      } catch (e) {}
    }
    if (!earthPosition) return

    if (activeShapePoints.value.length === 0) {
      activeShapePoints.value.push(earthPosition)

      // 创建动态点
      floatingPoint.value = viewer.value.entities.add({
        position: earthPosition,
        point: {
          pixelSize: 5,
          color: Color.YELLOW
        }
      })
    }
    activeShapePoints.value.push(earthPosition)
  }, ScreenSpaceEventType.LEFT_CLICK)

  measureHandler.value.setInputAction(() => {
    // 右键完成测量
    if (measureMode.value === 'distance') {
      finishDistanceMeasure()
    } else if (measureMode.value === 'area') {
      finishAreaMeasure()
    }
  }, ScreenSpaceEventType.RIGHT_CLICK)
}

// 测距
const measureDistance = () => {
  if (measureMode.value === 'distance') {
    cancelMeasure()
    return
  }
  cancelMeasure()
  measureMode.value = 'distance'
  measureResult.value = ''

  activeShapePoints.value = []
  activeShape.value = viewer.value.entities.add({
    polyline: {
      positions: new CallbackProperty(() => {
        return activeShapePoints.value
      }, false),
      width: 3,
      material: Color.YELLOW
    }
  })
}

// 完成距离测量
const finishDistanceMeasure = () => {
  if (activeShapePoints.value.length < 2) {
    cancelMeasure()
    return
  }

  let totalDistance = 0
  for (let i = 0; i < activeShapePoints.value.length - 1; i++) {
    totalDistance += Cartesian3.distance(activeShapePoints.value[i], activeShapePoints.value[i + 1])
  }

  // 转换为公里
  const distanceKm = (totalDistance / 1000).toFixed(2)
  measureResult.value = `距离: ${distanceKm} km`

  // 添加终点标签
  const lastPoint = activeShapePoints.value[activeShapePoints.value.length - 1]
  const labelEntity = viewer.value.entities.add({
    position: lastPoint,
    label: {
      text: `${distanceKm} km`,
      font: '14px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new CesiumNamespace.Cartesian2(0, -20)
    }
  })

  // 保存测量结果实体（包括起始点）
  const shapeEntity = activeShape.value
  const pointEntity = floatingPoint.value
  entities.value.push(shapeEntity, labelEntity, pointEntity)

  // 清理活动状态
  activeShape.value = null
  floatingPoint.value = null
  activeShapePoints.value = []
  measureMode.value = null
}

// 测面
const measureArea = () => {
  if (measureMode.value === 'area') {
    cancelMeasure()
    return
  }
  cancelMeasure()
  measureMode.value = 'area'
  measureResult.value = ''

  activeShapePoints.value = []
  activeShape.value = viewer.value.entities.add({
    polygon: {
      hierarchy: new CallbackProperty(() => {
        return new PolygonHierarchy(activeShapePoints.value)
      }, false),
      material: Color.RED.withAlpha(0.3),
      outline: true,
      outlineColor: Color.RED
    }
  })
}

// 完成面积测量
const finishAreaMeasure = () => {
  if (activeShapePoints.value.length < 3) {
    cancelMeasure()
    return
  }

  // 计算多边形面积（需要投影到局部坐标系）
  const positions = activeShapePoints.value.map(p => {
    const cart = CesiumNamespace.Cartographic.fromCartesian(p)
    return { lon: CesiumNamespace.Math.toDegrees(cart.longitude), lat: CesiumNamespace.Math.toDegrees(cart.latitude) }
  })

  // 使用简单的球面面积计算
  const area = calculatePolygonArea(positions)
  const areaKm2 = (area / 1000000).toFixed(2)
  measureResult.value = `面积: ${areaKm2} km²`

  // 添加中心点标签
  const centerLat = positions.reduce((sum, p) => sum + p.lat, 0) / positions.length
  const centerLon = positions.reduce((sum, p) => sum + p.lon, 0) / positions.length

  const labelEntity = viewer.value.entities.add({
    position: Cartesian3.fromDegrees(centerLon, centerLat),
    label: {
      text: `${areaKm2} km²`,
      font: '14px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new CesiumNamespace.Cartesian2(0, -20)
    }
  })

  // 保存测量结果实体（包括起始点）
  const shapeEntity = activeShape.value
  const pointEntity = floatingPoint.value
  entities.value.push(shapeEntity, labelEntity, pointEntity)

  // 清理活动状态
  activeShape.value = null
  floatingPoint.value = null
  activeShapePoints.value = []
  measureMode.value = null
}

// 计算球面多边形面积
const calculatePolygonArea = (positions) => {
  let area = 0
  const n = positions.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = CesiumNamespace.Math.toRadians(positions[i].lat)
    const lat2 = CesiumNamespace.Math.toRadians(positions[j].lat)
    const lon1 = CesiumNamespace.Math.toRadians(positions[i].lon)
    const lon2 = CesiumNamespace.Math.toRadians(positions[j].lon)

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  area = Math.abs(area * 6371000 * 6371000 / 2)
  return area
}

// 取消测量
const cancelMeasure = () => {
  if (activeShape.value) {
    viewer.value.entities.remove(activeShape.value)
    activeShape.value = null
  }
  if (floatingPoint.value) {
    viewer.value.entities.remove(floatingPoint.value)
    floatingPoint.value = null
  }
  activeShapePoints.value = []
  measureMode.value = null
}

// 添加 3D 模型
const addModel = () => {
  cancelMeasure()
  const entity = viewer.value.entities.add({
    position: Cartesian3.fromDegrees(116.397428, 39.90923, 0),
    model: {
      uri: 'https://cesium.com/public/Sandcastle/SampleData/models/CesiumAir/Cesium_Air.glb',
      minimumPixelSize: 128,
      maximumScale: 20000
    }
  })
  entities.value.push(entity)
  viewer.value.zoomTo(entity)
}

// 添加多边形区域
const addPolygon = () => {
  cancelMeasure()
  const entity = viewer.value.entities.add({
    polygon: {
      hierarchy: new PolygonHierarchy(
        Cartesian3.fromDegreesArray([
          116.397428, 39.90923,
          116.407428, 39.90923,
          116.407428, 39.91923,
          116.397428, 39.91923
        ])
      ),
      material: Color.RED.withAlpha(0.5),
      outline: true,
      outlineColor: Color.RED
    }
  })
  entities.value.push(entity)
}

// 添加折线
const addPolyline = () => {
  cancelMeasure()
  const entity = viewer.value.entities.add({
    polyline: {
      positions: Cartesian3.fromDegreesArray([
        116.397428, 39.90923,
        116.402428, 39.91423,
        116.407428, 39.91923
      ]),
      width: 5,
      material: Color.YELLOW
    }
  })
  entities.value.push(entity)
}

// 添加点标注
const addPoint = () => {
  cancelMeasure()
  const entity = viewer.value.entities.add({
    position: Cartesian3.fromDegrees(116.397428, 39.90923, 100),
    point: {
      pixelSize: 15,
      color: Color.BLUE,
      outlineColor: Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: '北京天安门',
      font: '16px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: CesiumNamespace.VerticalOrigin.BOTTOM,
      pixelOffset: new CesiumNamespace.Cartesian2(0, -10)
    }
  })
  entities.value.push(entity)
}

// 清除所有
const clearAll = () => {
  if (!viewer.value) return

  // 清除当前正在测量的活动状态
  if (activeShape.value) {
    viewer.value.entities.remove(activeShape.value)
    activeShape.value = null
  }
  if (floatingPoint.value) {
    viewer.value.entities.remove(floatingPoint.value)
    floatingPoint.value = null
  }
  activeShapePoints.value = []
  measureMode.value = null

  // 清除所有已保存的实体
  entities.value.forEach(entity => {
    viewer.value.entities.remove(entity)
  })
  entities.value = []
  measureResult.value = ''
}

onUnmounted(() => {
  cancelMeasure()
  if (measureHandler.value) {
    measureHandler.value.destroy()
  }
  if (viewer.value) {
    viewer.value.destroy()
  }
})
</script>

<style scoped>
.gis-page {
  width: 100%;
  height: 100vh;
  position: relative;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.controls button {
  padding: 10px 20px;
  background: rgba(42, 42, 42, 0.8);
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.controls button:hover {
  background: rgba(66, 185, 131, 0.9);
}

.controls button.active {
  background: rgba(66, 185, 131, 1);
  border-color: #42b983;
}

.measure-result {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(42, 42, 42, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 16px;
  z-index: 100;
}

.help-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(42, 42, 42, 0.85);
  border-radius: 8px;
  padding: 16px;
  color: white;
  font-size: 13px;
  z-index: 100;
  max-width: 280px;
}

.help-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  color: #42b983;
}

.help-content p {
  margin: 4px 0;
  line-height: 1.6;
}

.help-content .key {
  background: rgba(66, 185, 131, 0.3);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.help-content .func {
  color: #42b983;
  font-weight: 500;
}

.help-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 12px 0;
}
</style>