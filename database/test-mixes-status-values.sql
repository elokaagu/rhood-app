
INSERT INTO mixes (title, artist, genre, file_url, file_name, file_size, uploaded_by, user_id)
VALUES ('Test Mix 1'2qt , 'Test Artist', 'Electronic', 'http://test.com/mix1.mp3', 'test1.mp3', 1000, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
RETURNING id, status;