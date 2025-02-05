<script lang="ts" setup>
import { useUserStore } from "@/pinia/stores/user"
import Benefit from "./components/Benefit.vue"
import UserBehavior from "./components/UserBehavior.vue"

const userStore = useUserStore()
const isAdmin = userStore.roles.includes("writer")
</script>

<template>
  <div>
      <component :is="Benefit" />
      <component :is="UserBehavior" />
  </div>
</template>
