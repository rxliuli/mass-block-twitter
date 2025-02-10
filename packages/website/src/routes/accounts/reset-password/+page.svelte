<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
</script>

<div class="flex h-screen w-screen items-center justify-center">
  <Card.Root class="mx-auto w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-2xl">Mass Block Twitter</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div class="grid gap-2">
          <Label for="password">Enter the code sent to your email</Label>
          <div class="flex items-center gap-2">
            <Input id="password" required />
            <Button variant="outline">Send Mail</Button>
          </div>
        </div>
        <div>
          <Label for="password">New Password</Label>
          <Input id="password" type="password" required />
        </div>
        <div>
          <Label for="password">Confirm Password</Label>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" class="w-full">Reset password</Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
