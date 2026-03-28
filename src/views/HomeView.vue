<template>
  <div class="home">
    <h1>Phylogenetic Tree Demo</h1>
    <div class="links">
      <router-link to="/map" class="btn">基础地图</router-link>
      <router-link to="/gis" class="btn">三维 GIS Demo</router-link>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f5f5;
}

h1 {
  margin-bottom: 30px;
  color: #333;
}

.links {
  display: flex;
  gap: 20px;
}

.btn {
  padding: 12px 24px;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 16px;
  transition: background 0.3s;
}

.btn:hover {
  background: #359268;
}
</style>