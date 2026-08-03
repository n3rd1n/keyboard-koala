import { useEffect, useRef } from 'react'
import type { CommandJson } from '../types/command'
import { commandIdentity } from '../types/command'
import { groupByCategory } from '../commands/navigation'

type Props = {
	commands: CommandJson[]
	onFire: (command: CommandJson) => void
	onBack: () => void
	onHome: () => void
	onEscape: () => void
	onOpenEditor: () => void
	focusToken: number
}

export function KeyView({
	commands,
	onFire,
	onBack,
	onHome,
	onEscape,
	onOpenEditor,
	focusToken,
}: Props) {
	const rootRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		rootRef.current?.focus()
	}, [focusToken, commands])

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		const key = event.key

		if (key === 'Escape') {
			onEscape()
			return
		}
		if (key === '.') {
			onHome()
			return
		}
		if (key === '-') {
			onBack()
			return
		}
		if (key === ',' && (event.metaKey || event.ctrlKey)) {
			onOpenEditor()
			return
		}

		const command = commands.find((item) => item.key !== undefined && item.key === key)
		if (command) {
			event.preventDefault()
			onFire(command)
		}
	}

	const groups = groupByCategory(commands)

	return (
		<div className="view" tabIndex={0} ref={rootRef} onKeyDown={handleKeyDown}>
			<p className="hint">
				<span className="hint-item">
					<kbd>-</kbd> zurück
				</span>
				<span className="hint-item">
					<kbd>.</kbd> Home
				</span>
				<span className="hint-item">
					<kbd>Esc</kbd> schließen
				</span>
				<span className="hint-item">
					<kbd>⌘</kbd> <kbd>,</kbd> Config
				</span>
			</p>
			<div className="key-grid">
				{groups.map((group) => (
					<div
						className="key-column"
						key={group[0]?.category ?? 'none'}
					>
						<div className="group-name">
							{group[0]?.category ?? 'Other'}
						</div>
						{group.map((command, index) => (
							<button
								type="button"
								className="key-row"
								key={commandIdentity(
									command,
									index
								)}
								onClick={() => onFire(command)}
							>
								<span
									className={
										command.group ||
										command.type
											? 'key-badge nest'
											: 'key-badge'
									}
								>
									{command.key || '·'}
								</span>
								<span>{command.name}</span>
							</button>
						))}
					</div>
				))}
			</div>
		</div>
	)
}
