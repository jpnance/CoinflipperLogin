ci:
	docker run --rm -v $(PWD):/app node:22-alpine sh -c "cd /app && npm ci"

seed:
	@echo "Use something like:"
	@echo "docker exec -i login-mongo sh -c \"mongorestore --drop --archive\" < ~/backups/login.dump"

register:
	@echo "Use something like:"
	@echo "docker exec -i login-web sh -c \"cd /app/bin && node register.js <email address> <username>\""
