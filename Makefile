ci:
	docker run --rm -v $(PWD):/app node:14-alpine sh -c "cd /app && npm ci"

register:
	@echo "Use something like:"
	@echo "docker exec -i login-web sh -c \"cd /app/bin && node register.js <email address> <username>\""
