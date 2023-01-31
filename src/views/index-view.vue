<template>
  <div>
    <h1>JETWS (Japan Earthquake and Tsunami Warning System)</h1>
    <h2>By Allen Da</h2>
    <hr />
  </div>
  <div id="main-container">
    <div>
      <h1>
        1.
        <a :href="goTo('/map')">Earthquake Map</a>
      </h1>
    </div>
    <div>
      <h1>
        2.
        <a :href="goTo('/shake_level')">Shaking level</a>
      </h1>
    </div>
    <div>
      <h1>
        3.
        <a :href="goTo('/tsunami_info')">Tsunami expectation</a>
      </h1>
    </div>
    <div>
      <h1>
        4.
        <a :href="goTo('/tsunami_map')">Tsunami map</a>
      </h1>
    </div>
    <div>
      <h1>
        5.
        <a :href="goTo('/tsunami_watch')">Tsunami observation information</a>
      </h1>
    </div>
    <div>
      <h1>
        6.
        <a :href="goTo('/tsunami_forecast')">Tsunami forecast information</a>
      </h1>
    </div>
    <div>
      <h1>
        7.
        <a :href="goTo('/tsunami_forecast_map')">Tsunami forecast map</a>
      </h1>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

function goTo(link: string) {
  let route = useRouter().resolve({
    path: link,
  });
  return route.href;
}
</script>

<style>
body {
  font-family: B612, sans-serif;
  text-align: center;
  background: white;
  color: black;
}

a {
  color: #00aaff;
}

@media (prefers-color-scheme: dark) {
  body {
    font-family: B612, sans-serif;
    text-align: center;
    background: black;
    color: white;
  }
}

@media (prefers-color-scheme: light) {
  body {
    font-family: B612, sans-serif;
    text-align: center;
    background: white;
    color: black;
  }
}

table {
  font-size: 20px;
  margin: 0 auto;
  border: 1px solid black;
  border-collapse: collapse;
}

tr {
  color: white;
}

#main-container {
  width: 100%;
  height: 100%;
  display: grid;
}
</style>
