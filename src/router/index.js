import { createRouter, createWebHistory } from 'vue-router'
import MapView from '../views/MapView.vue'

const routes = [
  {
    path: '/',
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
  history: createWebHistory(),
  routes
})

export default router