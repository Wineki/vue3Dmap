import { createRouter, createWebHashHistory } from 'vue-router'
import MapView from '../views/MapView.vue'

const routes = [
  {
    path: '/maphome',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/map',
    name: 'map',
    component: MapView
  },
  {
    path: '/gis',
    name: 'gis',
    component: () => import('../views/GisDemoView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router