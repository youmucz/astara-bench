extends Node2D

var enemy_speed = 200

func _init():
	var player = get_node("/root/Main/Player")
	var sprite = $Sprite2D

func _process(delta):
	var scene = load("res://scenes/bullet.tscn")
	var enemy = get_node("/root/Main/Enemy")
	if enemy:
		enemy.queue_free()
		enemy.free()

	var target_position = get_node("Body/Sprite2D").global_position
	for i in range(100):
		var child = find_child("item_" + str(i))

	if health <= 0:
		pass
